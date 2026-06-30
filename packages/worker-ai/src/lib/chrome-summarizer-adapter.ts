import { WorkerAiRuntimeAdapter, WorkerAiTaskRequest } from './types';

export interface ChromeSummarizerAdapterConfig {
  sharedContext?: string;
  type?: 'tl;dr' | 'key-points' | 'teaser' | 'headline';
  format?: 'markdown' | 'plain-text';
  length?: 'short' | 'medium' | 'long';
}

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available' | string;

type ChromeSummarizer = {
  summarize(input: string, options?: Record<string, unknown>): Promise<string> | string;
  destroy?: () => void;
};

type ChromeSummarizerFactory = {
  availability(options?: Record<string, unknown>): Promise<Availability> | Availability;
  create(options?: Record<string, unknown>): Promise<ChromeSummarizer> | ChromeSummarizer;
};

export class ChromeSummarizerWorkerAiAdapter implements WorkerAiRuntimeAdapter<string, string> {
  readonly id = 'chrome-summarizer';
  private summarizer?: ChromeSummarizer;

  constructor(private readonly config: ChromeSummarizerAdapterConfig = {}) {}

  async init(): Promise<void> {
    const factory = getChromeSummarizerFactory();
    if (!factory) {
      throw new Error('Chrome Summarizer API is not available in this browser/context. Try Chrome Canary with built-in AI flags enabled.');
    }

    const options = this.createOptions();
    const availability = await factory.availability(options);
    if (availability === 'unavailable') {
      throw new Error('Chrome Summarizer API reported unavailable for this device/browser profile.');
    }

    this.summarizer = await factory.create(options);
  }

  async runTask(request: WorkerAiTaskRequest<string>): Promise<string> {
    if (!this.summarizer) throw new Error('Chrome Summarizer adapter is not initialized.');
    if (request.taskType !== 'summarize') {
      throw new Error(`Chrome Summarizer only supports summarize tasks, received '${request.taskType}'.`);
    }
    if (typeof request.input !== 'string') {
      throw new Error('Chrome Summarizer input must be a string.');
    }
    return this.summarizer.summarize(request.input);
  }

  dispose(): void {
    this.summarizer?.destroy?.();
  }

  private createOptions(): Record<string, unknown> {
    const options: Record<string, unknown> = {};
    if (this.config.sharedContext) options['sharedContext'] = this.config.sharedContext;
    if (this.config.type) options['type'] = this.config.type;
    if (this.config.format) options['format'] = this.config.format;
    if (this.config.length) options['length'] = this.config.length;
    return options;
  }
}

export function getChromeSummarizerFactory(): ChromeSummarizerFactory | undefined {
  const root = globalThis as unknown as {
    Summarizer?: ChromeSummarizerFactory;
    ai?: { summarizer?: ChromeSummarizerFactory };
  };
  return root.Summarizer ?? root.ai?.summarizer;
}
