import { ChromeSummarizerWorkerAiAdapter, getChromeSummarizerFactory } from './chrome-summarizer-adapter';

describe('ChromeSummarizerWorkerAiAdapter', () => {
  const originalSummarizer = (globalThis as unknown as { Summarizer?: unknown }).Summarizer;

  afterEach(() => {
    (globalThis as unknown as { Summarizer?: unknown }).Summarizer = originalSummarizer;
  });

  it('runs summarize through Chrome Summarizer API when available', async () => {
    const summarize = vi.fn().mockResolvedValue('short summary');
    (globalThis as unknown as { Summarizer?: unknown }).Summarizer = {
      availability: vi.fn().mockResolvedValue('available'),
      create: vi.fn().mockResolvedValue({ summarize }),
    };

    const adapter = new ChromeSummarizerWorkerAiAdapter({ length: 'short' });
    await adapter.init();

    await expect(
      adapter.runTask({ requestId: '1', taskType: 'summarize', input: 'Long text to summarize.' }),
    ).resolves.toBe('short summary');
    expect(summarize).toHaveBeenCalledWith('Long text to summarize.');
  });

  it('reports undefined factory when the browser API is absent', () => {
    (globalThis as unknown as { Summarizer?: unknown }).Summarizer = undefined;
    expect(getChromeSummarizerFactory()).toBeUndefined();
  });
});
