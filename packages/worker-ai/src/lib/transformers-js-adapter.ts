import { WorkerAiProgress, WorkerAiRuntimeAdapter, WorkerAiTaskRequest, WorkerAiTaskType } from './types';

export interface TransformersJsPipeline {
  (input: unknown, options?: unknown): Promise<unknown> | unknown;
}

export type TransformersJsPipelineFactory = (
  task: string,
  model?: string,
  options?: Record<string, unknown>,
) => Promise<TransformersJsPipeline> | TransformersJsPipeline;

export interface TransformersJsAdapterConfig {
  /** Transformers.js task name, e.g. 'summarization', 'text-classification', 'text2text-generation'. */
  task: string;
  /** Optional model id, e.g. 'Xenova/distilbart-cnn-6-6'. */
  model?: string;
  /** Options passed to Transformers.js pipeline(...) during initialization. */
  pipelineOptions?: Record<string, unknown>;
  /** Optional task mapper for app-level task names. */
  mapTaskType?: (taskType: WorkerAiTaskType) => string;
  /** Test seam or custom loader. Defaults to dynamic import('@huggingface/transformers'). */
  pipelineFactory?: TransformersJsPipelineFactory;
}

export class TransformersJsWorkerAiAdapter implements WorkerAiRuntimeAdapter<unknown, unknown> {
  readonly id = 'transformers-js';
  private pipeline?: TransformersJsPipeline;

  constructor(private readonly config: TransformersJsAdapterConfig) {}

  async init(emitProgress: (progress: WorkerAiProgress) => void): Promise<void> {
    emitProgress({ phase: 'init', message: 'Loading Transformers.js pipeline.' });
    const factory = this.config.pipelineFactory ?? (await loadTransformersJsPipelineFactory());
    this.pipeline = await factory(this.config.task, this.config.model, this.config.pipelineOptions);
    emitProgress({ phase: 'init', loaded: 1, total: 1, message: 'Transformers.js pipeline ready.' });
  }

  async runTask(request: WorkerAiTaskRequest): Promise<unknown> {
    if (!this.pipeline) throw new Error('Transformers.js adapter is not initialized.');

    const pipelineTask = this.config.mapTaskType?.(request.taskType) ?? this.config.task;
    if (pipelineTask !== this.config.task) {
      throw new Error(`Adapter initialized for '${this.config.task}' but received '${pipelineTask}'. Create one adapter per Transformers.js task.`);
    }

    const raw = await this.pipeline(request.input, request.options);
    return normalizeTransformersJsOutput(raw);
  }
}

export async function loadTransformersJsPipelineFactory(): Promise<TransformersJsPipelineFactory> {
  // Keep @huggingface/transformers optional. Consumers install it only when they use this adapter.
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<{ pipeline: TransformersJsPipelineFactory }>;
  const mod = await dynamicImport('@huggingface/transformers');
  return mod.pipeline;
}

export function normalizeTransformersJsOutput(raw: unknown): unknown {
  if (Array.isArray(raw) && raw.length === 1) return normalizeTransformersJsOutput(raw[0]);
  if (isRecord(raw)) {
    if (typeof raw['summary_text'] === 'string') return raw['summary_text'];
    if (typeof raw['generated_text'] === 'string') return raw['generated_text'];
    if (typeof raw['label'] === 'string') return raw;
  }
  return raw;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
