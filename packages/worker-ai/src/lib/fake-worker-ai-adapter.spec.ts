import { FakeWorkerAiAdapter } from './fake-worker-ai-adapter';

const adapter = new FakeWorkerAiAdapter();

describe('FakeWorkerAiAdapter', () => {
  it('provides deterministic summarize behavior for CI without model downloads', async () => {
    const output = await adapter.runTask({
      requestId: '1',
      taskType: 'summarize',
      input: 'Short text',
    });
    expect(output).toBe('Short text');
  });

  it('returns arbitrary custom task input by default', () => {
    const input = { any: 'payload' };
    expect(adapter.runTask({ requestId: '2', taskType: 'custom-task', input })).toBe(input);
  });
});
