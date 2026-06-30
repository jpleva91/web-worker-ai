import { createWorkerAiWorker } from './create-worker-ai-worker';
import { WorkerAiRuntimeAdapter, WorkerAiWorkerMessage } from './types';

describe('createWorkerAiWorker', () => {
  const originalOnMessage = globalThis.onmessage;
  const originalPostMessage = globalThis.postMessage;

  const dispatchToWorker = async (data: unknown) => {
    await (globalThis.onmessage as unknown as (event: MessageEvent) => unknown)?.({ data } as MessageEvent);
  };

  afterEach(() => {
    globalThis.onmessage = originalOnMessage;
    globalThis.postMessage = originalPostMessage;
    vi.restoreAllMocks();
  });

  it('initializes adapter and emits ready', async () => {
    const messages: WorkerAiWorkerMessage[] = [];
    globalThis.postMessage = vi.fn((message) => messages.push(message as WorkerAiWorkerMessage));
    const adapter: WorkerAiRuntimeAdapter = {
      id: 'mock',
      init: (emit) => emit({ phase: 'init', loaded: 1, total: 1 }),
      runTask: () => 'unused',
    };

    createWorkerAiWorker({ adapter });
    await dispatchToWorker({ type: 'init' });

    expect(messages).toContainEqual({ type: 'progress', progress: { phase: 'init', loaded: 1, total: 1 } });
    expect(messages).toContainEqual({ type: 'ready', adapterId: 'mock' });
  });

  it('runs tasks and preserves request correlation', async () => {
    const messages: WorkerAiWorkerMessage[] = [];
    globalThis.postMessage = vi.fn((message) => messages.push(message as WorkerAiWorkerMessage));
    const adapter: WorkerAiRuntimeAdapter = {
      id: 'mock',
      runTask: (request) => ({ echoed: request.input }),
    };

    createWorkerAiWorker({ adapter });
    await dispatchToWorker({
      type: 'task',
      request: { requestId: 'req-1', taskType: 'custom', input: 'payload', correlationKey: 'doc-1' },
    });

    expect(messages[0]).toMatchObject({
      type: 'result',
      result: {
        requestId: 'req-1',
        taskType: 'custom',
        output: { echoed: 'payload' },
        correlationKey: 'doc-1',
        adapterId: 'mock',
      },
    });
  });

  it('suppresses cancelled task results', async () => {
    const messages: WorkerAiWorkerMessage[] = [];
    globalThis.postMessage = vi.fn((message) => messages.push(message as WorkerAiWorkerMessage));
    const adapter: WorkerAiRuntimeAdapter = { id: 'mock', runTask: () => 'should not emit' };

    createWorkerAiWorker({ adapter });
    await dispatchToWorker({ type: 'cancel', requestId: 'req-1' });
    await dispatchToWorker({ type: 'task', request: { requestId: 'req-1', taskType: 'custom', input: 'payload' } });

    expect(messages).toEqual([]);
  });

  it('emits request-scoped errors', async () => {
    const messages: WorkerAiWorkerMessage[] = [];
    globalThis.postMessage = vi.fn((message) => messages.push(message as WorkerAiWorkerMessage));
    const adapter: WorkerAiRuntimeAdapter = {
      id: 'mock',
      runTask: () => {
        throw new TypeError('bad task');
      },
    };

    createWorkerAiWorker({ adapter });
    await dispatchToWorker({ type: 'task', request: { requestId: 'req-1', taskType: 'custom', input: 'payload' } });

    expect(messages[0]).toMatchObject({
      type: 'error',
      error: { requestId: 'req-1', errorClass: 'TypeError', message: 'bad task' },
    });
  });
});
