import { Injectable } from '@angular/core';
import { WorkerAiWarmupService } from './worker-ai-warmup.service';
import {
  WorkerAiRunOptions,
  WorkerAiTaskRequest,
  WorkerAiTaskResult,
  WorkerAiTaskType,
  WorkerAiTelemetrySink,
  WorkerAiWorkerMessage,
} from './types';

@Injectable({ providedIn: 'root' })
export class WorkerAiService {
  private telemetry?: WorkerAiTelemetrySink;

  constructor(private readonly warmup: WorkerAiWarmupService) {}

  configure(options: { telemetry?: WorkerAiTelemetrySink } = {}): void {
    this.telemetry = options.telemetry;
  }

  async run<TInput, TOutput = unknown>(
    taskType: WorkerAiTaskType,
    input: TInput,
    options: WorkerAiRunOptions<TOutput> = {},
  ): Promise<WorkerAiTaskResult<TOutput>> {
    const worker = this.warmup.getWorker();
    if (!worker) return this.useFallback(taskType, options, 'worker_not_ready');

    const request: WorkerAiTaskRequest<TInput> = {
      requestId: crypto.randomUUID(),
      taskType,
      input,
      correlationKey: options.correlationKey,
      timeoutMs: options.timeoutMs,
    };

    this.telemetry?.({ name: 'worker_ai_task_started', properties: { taskType } });

    try {
      const result = await this.requestWorker<TOutput>(worker, request, options.timeoutMs ?? 15000);
      if (options.isCurrent && !options.isCurrent(result.correlationKey)) {
        this.telemetry?.({ name: 'worker_ai_stale_result_discarded', properties: { taskType } });
        return this.useFallback(taskType, options, 'stale_result');
      }
      if (options.validate && !options.validate(result.output)) {
        return this.useFallback(taskType, options, 'validation_failed');
      }
      this.telemetry?.({ name: 'worker_ai_task_completed', properties: { taskType, adapterId: result.adapterId } });
      return result;
    } catch (error) {
      this.telemetry?.({
        name: 'worker_ai_task_failed',
        properties: { taskType, errorClass: error instanceof Error ? error.name : 'unknown' },
      });
      return this.useFallback(taskType, options, 'worker_error');
    }
  }

  private requestWorker<TOutput>(
    worker: Worker,
    request: WorkerAiTaskRequest,
    timeoutMs: number,
  ): Promise<WorkerAiTaskResult<TOutput>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.removeEventListener('message', onMessage);
        worker.postMessage({ type: 'cancel', requestId: request.requestId });
        reject(new DOMException('Worker AI request timed out.', 'TimeoutError'));
      }, timeoutMs);

      const onMessage = ({ data }: MessageEvent<WorkerAiWorkerMessage<TOutput>>) => {
        if (data.type === 'result' && data.result.requestId === request.requestId) {
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          resolve(data.result);
        }
        if (data.type === 'error' && data.error.requestId === request.requestId) {
          clearTimeout(timeout);
          worker.removeEventListener('message', onMessage);
          reject(new Error(data.error.message ?? data.error.errorClass));
        }
      };

      worker.addEventListener('message', onMessage);
      worker.postMessage({ type: 'task', request });
    });
  }

  private async useFallback<TOutput>(
    taskType: WorkerAiTaskType,
    options: WorkerAiRunOptions<TOutput>,
    reason: string,
  ): Promise<WorkerAiTaskResult<TOutput>> {
    if (!options.fallback) throw new Error(`Worker AI unavailable and no fallback provided: ${reason}`);
    const output = await options.fallback();
    this.telemetry?.({ name: 'worker_ai_task_failed', properties: { taskType, errorClass: reason } });
    return {
      requestId: 'fallback',
      taskType,
      output,
      correlationKey: options.correlationKey,
      adapterId: 'fallback',
    };
  }
}
