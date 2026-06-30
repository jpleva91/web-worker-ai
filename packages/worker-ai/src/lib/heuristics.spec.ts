import { getWorkerAiSkipReason } from './heuristics';

describe('getWorkerAiSkipReason', () => {
  it('skips when explicitly disabled', () => {
    expect(getWorkerAiSkipReason({ explicitlyDisabled: true })).toBe('disabled');
  });

  it('skips when workers are unavailable', () => {
    expect(getWorkerAiSkipReason({ workerSupported: false })).toBe('worker_unsupported');
  });

  it('skips when Save-Data is enabled', () => {
    expect(getWorkerAiSkipReason({ saveData: true })).toBe('save_data');
  });

  it('skips on very slow network hints', () => {
    expect(getWorkerAiSkipReason({ effectiveType: '2g' })).toBe('slow_connection');
  });

  it('skips when estimated remaining storage is below threshold', () => {
    expect(
      getWorkerAiSkipReason({ quotaBytes: 1000, usageBytes: 900, minRemainingStorageBytes: 200 }),
    ).toBe('low_storage');
  });

  it('does not skip when no risk signal is present', () => {
    expect(
      getWorkerAiSkipReason({
        workerSupported: true,
        quotaBytes: 1024 * 1024 * 1024,
        usageBytes: 100 * 1024 * 1024,
      }),
    ).toBeNull();
  });
});
