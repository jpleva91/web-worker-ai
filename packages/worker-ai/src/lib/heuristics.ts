import { WorkerAiSkipContext, WorkerAiSkipReason } from './types';

const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);

export function getWorkerAiSkipReason(context: WorkerAiSkipContext): WorkerAiSkipReason | null {
  if (context.explicitlyDisabled) return 'disabled';
  if (context.workerSupported === false) return 'worker_unsupported';
  if (context.saveData) return 'save_data';
  if (context.effectiveType && SLOW_CONNECTIONS.has(context.effectiveType)) return 'slow_connection';

  const minRemaining = context.minRemainingStorageBytes ?? 250 * 1024 * 1024;
  if (context.quotaBytes !== undefined && context.usageBytes !== undefined) {
    const remaining = context.quotaBytes - context.usageBytes;
    if (remaining >= 0 && remaining < minRemaining) return 'low_storage';
  }

  return null;
}

export async function readBrowserSkipContext(options: {
  minRemainingStorageBytes?: number;
  explicitlyDisabled?: boolean;
} = {}): Promise<WorkerAiSkipContext> {
  const nav = globalThis.navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    storage?: { estimate?: () => Promise<{ quota?: number; usage?: number }> };
  };

  const estimate = await nav.storage?.estimate?.().catch(() => undefined);

  return {
    explicitlyDisabled: options.explicitlyDisabled,
    minRemainingStorageBytes: options.minRemainingStorageBytes,
    workerSupported: typeof Worker !== 'undefined',
    saveData: nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
    quotaBytes: estimate?.quota,
    usageBytes: estimate?.usage,
  };
}
