export type WorkerAiWarmupState = 'idle' | 'warming' | 'ready' | 'failed' | 'skipped';

export type WorkerAiTaskType =
  | 'summarize'
  | 'rewrite'
  | 'extract-json'
  | 'classify'
  | (string & {});

export interface WorkerAiTaskRequest<TInput = unknown, TOptions = unknown> {
  requestId: string;
  taskType: WorkerAiTaskType;
  input: TInput;
  options?: TOptions;
  correlationKey?: string;
  timeoutMs?: number;
}

export interface WorkerAiTaskResult<TOutput = unknown> {
  requestId: string;
  taskType: WorkerAiTaskType;
  output: TOutput;
  correlationKey?: string;
  durationMs?: number;
  adapterId?: string;
}

export interface WorkerAiTaskError {
  requestId?: string;
  errorClass: string;
  message?: string;
  retryable?: boolean;
}

export interface WorkerAiProgress {
  phase: 'download' | 'init' | 'task' | (string & {});
  loaded?: number;
  total?: number;
  message?: string;
}

export type WorkerAiWorkerMessage<TOutput = unknown> =
  | { type: 'ready'; adapterId?: string }
  | { type: 'progress'; progress: WorkerAiProgress }
  | { type: 'result'; result: WorkerAiTaskResult<TOutput> }
  | { type: 'error'; error: WorkerAiTaskError };

export type WorkerAiMainMessage<TInput = unknown, TOptions = unknown> =
  | { type: 'init' }
  | { type: 'task'; request: WorkerAiTaskRequest<TInput, TOptions> }
  | { type: 'cancel'; requestId: string };

export interface WorkerAiRuntimeAdapter<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  init?(emitProgress: (progress: WorkerAiProgress) => void): Promise<void> | void;
  runTask(request: WorkerAiTaskRequest<TInput>): Promise<TOutput> | TOutput;
  dispose?(): Promise<void> | void;
}

export interface WorkerAiSkipContext {
  saveData?: boolean;
  effectiveType?: string;
  quotaBytes?: number;
  usageBytes?: number;
  minRemainingStorageBytes?: number;
  workerSupported?: boolean;
  explicitlyDisabled?: boolean;
}

export type WorkerAiSkipReason =
  | 'disabled'
  | 'worker_unsupported'
  | 'save_data'
  | 'slow_connection'
  | 'low_storage';

export interface WorkerAiWarmupSnapshot {
  state: WorkerAiWarmupState;
  progress?: WorkerAiProgress;
  skipReason?: WorkerAiSkipReason;
  error?: WorkerAiTaskError;
}

export interface WorkerAiTelemetryEvent {
  name:
    | 'worker_ai_warmup_started'
    | 'worker_ai_warmup_ready'
    | 'worker_ai_warmup_failed'
    | 'worker_ai_warmup_skipped'
    | 'worker_ai_task_started'
    | 'worker_ai_task_completed'
    | 'worker_ai_task_failed'
    | 'worker_ai_stale_result_discarded';
  properties?: Record<string, string | number | boolean | undefined>;
}

export type WorkerAiTelemetrySink = (event: WorkerAiTelemetryEvent) => void;

export interface WorkerAiRunOptions<TOutput = unknown> {
  correlationKey?: string;
  timeoutMs?: number;
  validate?: (output: unknown) => output is TOutput;
  fallback?: () => TOutput | Promise<TOutput>;
  isCurrent?: (correlationKey: string | undefined) => boolean;
}
