import { Injectable, signal } from '@angular/core';
import { getWorkerAiSkipReason, readBrowserSkipContext } from './heuristics';
import {
  WorkerAiProgress,
  WorkerAiSkipReason,
  WorkerAiTelemetrySink,
  WorkerAiWarmupSnapshot,
  WorkerAiWarmupState,
  WorkerAiWorkerMessage,
} from './types';

export interface WorkerAiWarmupConfig {
  createWorker: () => Worker;
  disabled?: boolean;
  minRemainingStorageBytes?: number;
  telemetry?: WorkerAiTelemetrySink;
}

@Injectable({ providedIn: 'root' })
export class WorkerAiWarmupService {
  private readonly snapshotSignal = signal<WorkerAiWarmupSnapshot>({ state: 'idle' });
  private worker?: Worker;
  private config?: WorkerAiWarmupConfig;

  readonly snapshot = this.snapshotSignal.asReadonly();

  configure(config: WorkerAiWarmupConfig): void {
    this.config = config;
  }

  get state(): WorkerAiWarmupState {
    return this.snapshotSignal().state;
  }

  get ready(): boolean {
    return this.state === 'ready' && !!this.worker;
  }

  getWorker(): Worker | undefined {
    return this.ready ? this.worker : undefined;
  }

  async startAfterIdle(): Promise<WorkerAiWarmupSnapshot> {
    await waitForIdle();
    return this.start();
  }

  async start(): Promise<WorkerAiWarmupSnapshot> {
    if (this.state !== 'idle') return this.snapshotSignal();
    if (!this.config) throw new Error('WorkerAiWarmupService must be configured before start().');

    const context = await readBrowserSkipContext({
      explicitlyDisabled: this.config.disabled,
      minRemainingStorageBytes: this.config.minRemainingStorageBytes,
    });
    const skipReason = getWorkerAiSkipReason(context);
    if (skipReason) return this.markSkipped(skipReason);

    this.snapshotSignal.set({ state: 'warming' });
    this.config.telemetry?.({ name: 'worker_ai_warmup_started' });

    this.worker = this.config.createWorker();
    this.worker.onmessage = ({ data }: MessageEvent<WorkerAiWorkerMessage>) => this.onWorkerMessage(data);
    this.worker.onerror = (event) => {
      this.snapshotSignal.set({
        state: 'failed',
        error: { errorClass: 'worker_error', message: event.message },
      });
      this.config?.telemetry?.({ name: 'worker_ai_warmup_failed', properties: { errorClass: 'worker_error' } });
    };
    this.worker.postMessage({ type: 'init' });
    return this.snapshotSignal();
  }

  private onWorkerMessage(message: WorkerAiWorkerMessage): void {
    if (message.type === 'progress') {
      this.patchProgress(message.progress);
      return;
    }
    if (message.type === 'ready') {
      this.snapshotSignal.set({ state: 'ready' });
      this.config?.telemetry?.({ name: 'worker_ai_warmup_ready', properties: { adapterId: message.adapterId } });
      return;
    }
    if (message.type === 'error' && !message.error.requestId) {
      this.snapshotSignal.set({ state: 'failed', error: message.error });
      this.config?.telemetry?.({
        name: 'worker_ai_warmup_failed',
        properties: { errorClass: message.error.errorClass },
      });
    }
  }

  private patchProgress(progress: WorkerAiProgress): void {
    this.snapshotSignal.update((current) => ({ ...current, progress }));
  }

  private markSkipped(skipReason: WorkerAiSkipReason): WorkerAiWarmupSnapshot {
    const snapshot: WorkerAiWarmupSnapshot = { state: 'skipped', skipReason };
    this.snapshotSignal.set(snapshot);
    this.config?.telemetry?.({ name: 'worker_ai_warmup_skipped', properties: { reason: skipReason } });
    return snapshot;
  }
}

function waitForIdle(): Promise<void> {
  return new Promise((resolve) => {
    const requestIdle = (globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void;
    }).requestIdleCallback;

    if (requestIdle) {
      requestIdle(() => resolve(), { timeout: 3000 });
      return;
    }
    setTimeout(resolve, 0);
  });
}
