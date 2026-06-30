import { WorkerAiService } from './worker-ai.service';
import { WorkerAiWarmupService } from './worker-ai-warmup.service';
import { WorkerAiWorkerMessage } from './types';

class MockWorker {
  readonly posted: unknown[] = [];
  private listeners = new Set<(event: MessageEvent<WorkerAiWorkerMessage>) => void>();

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent<WorkerAiWorkerMessage>) => void): void {
    this.listeners.add(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent<WorkerAiWorkerMessage>) => void): void {
    this.listeners.delete(listener);
  }

  emit(message: WorkerAiWorkerMessage): void {
    for (const listener of this.listeners) listener({ data: message } as MessageEvent<WorkerAiWorkerMessage>);
  }
}

describe('WorkerAiService', () => {
  it('uses fallback when worker is not ready', async () => {
    const warmup = { getWorker: () => undefined } as unknown as WorkerAiWarmupService;
    const service = new WorkerAiService(warmup);

    const result = await service.run('summarize', 'input', { fallback: () => 'fallback output' });

    expect(result.adapterId).toBe('fallback');
    expect(result.output).toBe('fallback output');
  });

  it('correlates worker responses by requestId', async () => {
    const worker = new MockWorker();
    const warmup = { getWorker: () => worker as unknown as Worker } as unknown as WorkerAiWarmupService;
    const service = new WorkerAiService(warmup);

    const promise = service.run<string, string>('rewrite', ' hello ', { fallback: () => 'fallback' });
    const taskMessage = worker.posted[worker.posted.length - 1] as { request: { requestId: string } };

    worker.emit({
      type: 'result',
      result: {
        requestId: taskMessage.request.requestId,
        taskType: 'rewrite',
        output: 'hello',
        adapterId: 'mock',
      },
    });

    await expect(promise).resolves.toMatchObject({ output: 'hello', adapterId: 'mock' });
  });

  it('uses fallback for stale correlated results', async () => {
    const worker = new MockWorker();
    const warmup = { getWorker: () => worker as unknown as Worker } as unknown as WorkerAiWarmupService;
    const service = new WorkerAiService(warmup);

    const promise = service.run<string, string>('summarize', 'old text', {
      correlationKey: 'old-doc',
      isCurrent: (key) => key === 'current-doc',
      fallback: () => 'current fallback',
    });
    const taskMessage = worker.posted[worker.posted.length - 1] as { request: { requestId: string } };

    worker.emit({
      type: 'result',
      result: {
        requestId: taskMessage.request.requestId,
        taskType: 'summarize',
        output: 'stale output',
        correlationKey: 'old-doc',
        adapterId: 'mock',
      },
    });

    await expect(promise).resolves.toMatchObject({ output: 'current fallback', adapterId: 'fallback' });
  });

  it('uses fallback when validation rejects output', async () => {
    const worker = new MockWorker();
    const warmup = { getWorker: () => worker as unknown as Worker } as unknown as WorkerAiWarmupService;
    const service = new WorkerAiService(warmup);

    const promise = service.run<string, string>('extract-json', 'input', {
      validate: (value): value is string => typeof value === 'string' && value.startsWith('{'),
      fallback: () => '{}',
    });
    const taskMessage = worker.posted[worker.posted.length - 1] as { request: { requestId: string } };

    worker.emit({
      type: 'result',
      result: {
        requestId: taskMessage.request.requestId,
        taskType: 'extract-json',
        output: 'not json',
        adapterId: 'mock',
      },
    });

    await expect(promise).resolves.toMatchObject({ output: '{}', adapterId: 'fallback' });
  });

  it('cancels and uses fallback on timeout', async () => {
    vi.useFakeTimers();
    const worker = new MockWorker();
    const warmup = { getWorker: () => worker as unknown as Worker } as unknown as WorkerAiWarmupService;
    const service = new WorkerAiService(warmup);

    const promise = service.run<string, string>('summarize', 'input', {
      timeoutMs: 10,
      fallback: () => 'timeout fallback',
    });

    await vi.advanceTimersByTimeAsync(11);

    await expect(promise).resolves.toMatchObject({ output: 'timeout fallback', adapterId: 'fallback' });
    expect(worker.posted[worker.posted.length - 1]).toMatchObject({ type: 'cancel' });
    vi.useRealTimers();
  });
});
