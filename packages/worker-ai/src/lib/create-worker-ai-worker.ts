import { WorkerAiRuntimeAdapter, WorkerAiWorkerMessage } from './types';

export interface WorkerAiWorkerHarnessOptions {
  adapter: WorkerAiRuntimeAdapter;
}

export function createWorkerAiWorker(options: WorkerAiWorkerHarnessOptions): void {
  const adapter = options.adapter;
  const cancelled = new Set<string>();

  const emit = (message: WorkerAiWorkerMessage) => globalThis.postMessage(message);

  globalThis.onmessage = async ({ data }) => {
    try {
      if (data?.type === 'init') {
        await adapter.init?.((progress) => emit({ type: 'progress', progress }));
        emit({ type: 'ready', adapterId: adapter.id });
        return;
      }

      if (data?.type === 'cancel') {
        cancelled.add(data.requestId);
        return;
      }

      if (data?.type === 'task') {
        const started = performance.now();
        const request = data.request;
        if (cancelled.has(request.requestId)) return;

        const output = await adapter.runTask(request);
        if (cancelled.has(request.requestId)) return;

        emit({
          type: 'result',
          result: {
            requestId: request.requestId,
            taskType: request.taskType,
            output,
            correlationKey: request.correlationKey,
            durationMs: Math.round(performance.now() - started),
            adapterId: adapter.id,
          },
        });
      }
    } catch (error) {
      emit({
        type: 'error',
        error: {
          requestId: data?.request?.requestId,
          errorClass: classifyWorkerAiError(error),
          message: error instanceof Error ? error.message : String(error),
        },
      });
    }
  };
}

export function classifyWorkerAiError(error: unknown): string {
  if (error instanceof DOMException) return error.name;
  if (error instanceof Error && error.name) return error.name;
  return 'unknown_worker_ai_error';
}
