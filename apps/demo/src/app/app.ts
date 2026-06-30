import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkerAiTaskResult, WorkerAiWorkerMessage } from 'web-worker-ai';

type RuntimeId = 'chrome' | 'transformers' | 'fake';

type DemoRuntime = {
  id: RuntimeId;
  label: string;
  description: string;
};

type RuntimeState = 'idle' | 'initializing' | 'running' | 'done' | 'skipped' | 'error';

type RuntimeResult = {
  state: RuntimeState;
  output?: string;
  error?: string;
  adapterId?: string;
  durationMs?: number;
};

type CascadeStep = {
  runtime: RuntimeId;
  reason: string;
  result: RuntimeResult;
};

type ChromeSummarizer = {
  summarize(input: string, options?: Record<string, unknown>): Promise<string> | string;
  destroy?: () => void;
};

type ChromeSummarizerFactory = {
  availability(options?: Record<string, unknown>): Promise<string> | string;
  create(options?: Record<string, unknown>): Promise<ChromeSummarizer> | ChromeSummarizer;
};

@Component({
  imports: [FormsModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly inputText = signal(
    'Browser-local summarization is a good fit for small text workloads because the model can run near the UI without sending data to a server. Running inference in a Web Worker keeps loading and generation off the main thread, while the app can still fall back if the device or browser cannot support the selected runtime.',
  );

  protected readonly runtimes: DemoRuntime[] = [
    {
      id: 'chrome',
      label: '1. Chrome / Edge Summarizer API',
      description: 'Preferred path. Uses the browser-provided Summarizer API on the main thread when available in Chromium browsers/profiles.',
    },
    {
      id: 'transformers',
      label: '2. Hugging Face Transformers.js fallback',
      description: 'Fallback path. Downloads a small browser model and summarizes inside a Web Worker when the browser API is absent.',
    },
    {
      id: 'fake',
      label: '3. Deterministic fallback',
      description: 'Last-resort path. No model download; deterministic trim so the app still returns something predictable.',
    },
  ];

  protected readonly results = signal<Record<RuntimeId, RuntimeResult>>({
    chrome: { state: 'idle' },
    transformers: { state: 'idle' },
    fake: { state: 'idle' },
  });
  protected readonly cascadeRunning = signal(false);
  protected readonly cascadeLog = signal<CascadeStep[]>([]);
  protected readonly finalOutput = signal('');

  protected updateInput(value: string): void {
    this.inputText.set(value);
  }

  protected async runCascade(): Promise<void> {
    const input = this.inputText().trim();
    if (!input || this.cascadeRunning()) return;

    this.cascadeRunning.set(true);
    this.finalOutput.set('');
    this.cascadeLog.set([]);
    this.results.set({
      chrome: { state: 'idle' },
      transformers: { state: 'idle' },
      fake: { state: 'idle' },
    });

    for (const runtime of ['chrome', 'transformers', 'fake'] as const) {
      const result = await this.runRuntime(runtime, input);
      this.appendCascadeStep(runtime, result);
      if (result.state === 'done' && result.output) {
        this.finalOutput.set(result.output);
        this.markRemainingSkipped(runtime);
        this.cascadeRunning.set(false);
        return;
      }
    }

    this.cascadeRunning.set(false);
  }

  protected async runSingle(runtime: RuntimeId): Promise<void> {
    const input = this.inputText().trim();
    if (!input) return;
    await this.runRuntime(runtime, input);
  }

  private runRuntime(runtime: RuntimeId, input: string): Promise<RuntimeResult> {
    if (runtime === 'chrome') return this.runChromeSummarizer(input);
    return this.runWorkerRuntime(runtime, input);
  }

  private async runChromeSummarizer(input: string): Promise<RuntimeResult> {
    this.setResult('chrome', { state: 'initializing' });
    const started = performance.now();

    try {
      const factory = this.getChromeSummarizerFactory();
      if (!factory) {
        throw new Error('Chrome/Edge Summarizer API is not exposed in this browser. Use Chrome or Edge 138+ with built-in AI support, sufficient device resources, and the model available.');
      }

      const options = {
        type: 'tldr',
        format: 'plain-text',
        length: 'short',
      };
      const availability = await this.withTimeout(
        factory.availability(options),
        10000,
        'Timed out checking Chrome/Edge Summarizer availability.',
      );
      if (availability === 'unavailable') {
        throw new Error('Chrome/Edge Summarizer API reported unavailable for this browser profile/device.');
      }

      this.setResult('chrome', {
        state: 'running',
        adapterId: 'chrome-summarizer',
        error: availability === 'downloadable' || availability === 'downloading'
          ? 'Chrome is downloading or preparing the built-in model. If this takes too long, the demo will fall back.'
          : undefined,
      });
      const summarizer = await this.withTimeout(
        factory.create({
          ...options,
          monitor: (monitor: EventTarget) => {
            monitor.addEventListener('downloadprogress', (event) => {
              const progress = event as ProgressEvent;
              const percent = Number.isFinite(progress.loaded) ? Math.round(progress.loaded * 100) : undefined;
              this.setResult('chrome', {
                state: 'running',
                adapterId: 'chrome-summarizer',
                error: percent === undefined ? 'Downloading Chrome built-in model…' : `Downloading Chrome built-in model… ${percent}%`,
              });
            });
          },
        }),
        45000,
        'Timed out creating Chrome/Edge Summarizer. The browser may still be downloading the on-device model; falling back for this run.',
      );
      const output = await this.withTimeout(
        summarizer.summarize(input),
        30000,
        'Timed out waiting for Chrome/Edge Summarizer output; falling back for this run.',
      );
      summarizer.destroy?.();

      const result: RuntimeResult = {
        state: 'done',
        output,
        adapterId: 'chrome-summarizer',
        durationMs: Math.round(performance.now() - started),
      };
      this.setResult('chrome', result);
      return result;
    } catch (error) {
      const result: RuntimeResult = {
        state: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
      this.setResult('chrome', result);
      return result;
    }
  }

  private runWorkerRuntime(runtime: Exclude<RuntimeId, 'chrome'>, input: string): Promise<RuntimeResult> {
    this.setResult(runtime, { state: 'initializing' });
    const worker = this.createWorker(runtime);
    const requestId = crypto.randomUUID();

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        worker.terminate();
        const result: RuntimeResult = {
          state: 'error',
          error: runtime === 'transformers'
            ? 'Timed out while loading/running Transformers.js. The model may still be downloading; try again after it finishes caching.'
            : 'Timed out waiting for the worker runtime.',
        };
        this.setResult(runtime, result);
        resolve(result);
      }, runtime === 'transformers' ? 120000 : 20000);

      worker.onmessage = ({ data }: MessageEvent<WorkerAiWorkerMessage<string>>) => {
        if (data.type === 'ready') {
          this.setResult(runtime, { state: 'running', adapterId: data.adapterId });
          worker.postMessage({
            type: 'task',
            request: {
              requestId,
              taskType: 'summarize',
              input,
              timeoutMs: runtime === 'transformers' ? 120000 : 20000,
            },
          });
          return;
        }

        if (data.type === 'result' && data.result.requestId === requestId) {
          window.clearTimeout(timeout);
          worker.terminate();
          const result = this.resultFromWorker(data.result);
          this.setResult(runtime, result);
          resolve(result);
          return;
        }

        if (data.type === 'error') {
          window.clearTimeout(timeout);
          worker.terminate();
          const result: RuntimeResult = {
            state: 'error',
            error: data.error.message ?? data.error.errorClass,
          };
          this.setResult(runtime, result);
          resolve(result);
        }
      };

      worker.onerror = (event) => {
        window.clearTimeout(timeout);
        worker.terminate();
        const result: RuntimeResult = { state: 'error', error: event.message };
        this.setResult(runtime, result);
        resolve(result);
      };

      worker.postMessage({ type: 'init' });
    });
  }

  private createWorker(runtime: Exclude<RuntimeId, 'chrome'>): Worker {
    if (runtime === 'transformers') {
      return new Worker(new URL('./transformers-summary.worker', import.meta.url), { type: 'module' });
    }
    return new Worker(new URL('./fake-summary.worker', import.meta.url), { type: 'module' });
  }

  private getChromeSummarizerFactory(): ChromeSummarizerFactory | undefined {
    const root = globalThis as unknown as {
      Summarizer?: ChromeSummarizerFactory;
      ai?: { summarizer?: ChromeSummarizerFactory };
    };
    return root.Summarizer ?? root.ai?.summarizer;
  }

  private setResult(runtime: RuntimeId, result: RuntimeResult): void {
    this.results.update((current) => ({ ...current, [runtime]: result }));
  }

  private withTimeout<T>(value: Promise<T> | T, timeoutMs: number, message: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
      Promise.resolve(value)
        .then((result) => {
          window.clearTimeout(timeout);
          resolve(result);
        })
        .catch((error: unknown) => {
          window.clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private resultFromWorker(result: WorkerAiTaskResult<string>): RuntimeResult {
    return {
      state: 'done',
      output: result.output,
      adapterId: result.adapterId,
      durationMs: result.durationMs,
    };
  }

  private appendCascadeStep(runtime: RuntimeId, result: RuntimeResult): void {
    const reason = result.state === 'done'
      ? 'Used successfully.'
      : result.error ?? 'Unavailable; falling back.';
    this.cascadeLog.update((current) => [...current, { runtime, reason, result }]);
  }

  private markRemainingSkipped(successfulRuntime: RuntimeId): void {
    const order: RuntimeId[] = ['chrome', 'transformers', 'fake'];
    const successIndex = order.indexOf(successfulRuntime);
    for (const runtime of order.slice(successIndex + 1)) {
      const skipped: RuntimeResult = { state: 'skipped', error: `Skipped because ${successfulRuntime} succeeded.` };
      this.setResult(runtime, skipped);
    }
  }
}
