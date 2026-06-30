import { WorkerAiWarmupService } from './worker-ai-warmup.service';
import { WorkerAiWorkerMessage } from './types';

class MockWorker {
  onmessage?: (event: MessageEvent<WorkerAiWorkerMessage>) => void;
  onerror?: (event: ErrorEvent) => void;
  readonly posted: unknown[] = [];

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  emit(message: WorkerAiWorkerMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerAiWorkerMessage>);
  }
}

describe('WorkerAiWarmupService', () => {
  const originalWorker = globalThis.Worker;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalWorker) vi.stubGlobal('Worker', originalWorker);
  });

  it('marks warmup skipped when disabled', async () => {
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const service = new WorkerAiWarmupService();
    const events: string[] = [];

    service.configure({
      disabled: true,
      createWorker: () => new MockWorker() as unknown as Worker,
      telemetry: (event) => events.push(event.name),
    });

    await expect(service.start()).resolves.toMatchObject({ state: 'skipped', skipReason: 'disabled' });
    expect(events).toContain('worker_ai_warmup_skipped');
  });

  it('posts init and transitions to ready when worker emits ready', async () => {
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const worker = new MockWorker();
    const service = new WorkerAiWarmupService();
    const events: string[] = [];

    service.configure({
      createWorker: () => worker as unknown as Worker,
      minRemainingStorageBytes: 0,
      telemetry: (event) => events.push(event.name),
    });

    await service.start();
    expect(service.state).toBe('warming');
    expect(worker.posted).toContainEqual({ type: 'init' });

    worker.emit({ type: 'ready', adapterId: 'mock' });

    expect(service.state).toBe('ready');
    expect(service.getWorker()).toBe(worker);
    expect(events).toContain('worker_ai_warmup_ready');
  });

  it('captures progress and init errors from worker protocol', async () => {
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);
    const worker = new MockWorker();
    const service = new WorkerAiWarmupService();

    service.configure({ createWorker: () => worker as unknown as Worker, minRemainingStorageBytes: 0 });

    await service.start();
    worker.emit({ type: 'progress', progress: { phase: 'init', loaded: 1, total: 2 } });
    expect(service.snapshot().progress).toEqual({ phase: 'init', loaded: 1, total: 2 });

    worker.emit({ type: 'error', error: { errorClass: 'InitError', message: 'bad init' } });
    expect(service.snapshot()).toMatchObject({ state: 'failed', error: { errorClass: 'InitError' } });
  });
});
