import { WorkerAiRuntimeAdapter, WorkerAiTaskRequest, WorkerAiProgress } from './types';

export class FakeWorkerAiAdapter implements WorkerAiRuntimeAdapter<unknown, unknown> {
  readonly id = 'fake-worker-ai-adapter';

  async init(emitProgress: (progress: WorkerAiProgress) => void): Promise<void> {
    emitProgress({ phase: 'init', loaded: 1, total: 1, message: 'Fake adapter ready.' });
  }

  runTask(request: WorkerAiTaskRequest): unknown {
    if (request.taskType === 'summarize' && typeof request.input === 'string') {
      return request.input.length > 140 ? `${request.input.slice(0, 137)}...` : request.input;
    }
    if (request.taskType === 'rewrite' && typeof request.input === 'string') {
      return request.input.trim();
    }
    if (request.taskType === 'classify') {
      return { label: 'unknown', confidence: 0 };
    }
    return request.input;
  }
}
