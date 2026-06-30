import { normalizeTransformersJsOutput, TransformersJsWorkerAiAdapter } from './transformers-js-adapter';

describe('TransformersJsWorkerAiAdapter', () => {
  it('loads an injected pipeline factory and returns normalized summarization text', async () => {
    const adapter = new TransformersJsWorkerAiAdapter({
      task: 'summarization',
      model: 'test/model',
      pipelineFactory: async (task, model) => {
        expect(task).toBe('summarization');
        expect(model).toBe('test/model');
        return async (input) => [{ summary_text: `summary: ${input}` }];
      },
    });

    const progress: unknown[] = [];
    await adapter.init((event) => progress.push(event));

    await expect(
      adapter.runTask({ requestId: '1', taskType: 'summarize', input: 'hello world' }),
    ).resolves.toBe('summary: hello world');
    expect(progress).toHaveLength(2);
  });

  it('normalizes common Transformers.js output shapes', () => {
    expect(normalizeTransformersJsOutput([{ summary_text: 'short' }])).toBe('short');
    expect(normalizeTransformersJsOutput([{ generated_text: 'rewritten' }])).toBe('rewritten');
    expect(normalizeTransformersJsOutput([{ label: 'POSITIVE', score: 0.9 }])).toEqual({ label: 'POSITIVE', score: 0.9 });
  });

  it('rejects mismatched mapped task types so one adapter owns one pipeline task', async () => {
    const adapter = new TransformersJsWorkerAiAdapter({
      task: 'summarization',
      mapTaskType: () => 'text-classification',
      pipelineFactory: async () => async () => 'unused',
    });

    await adapter.init(() => undefined);
    await expect(adapter.runTask({ requestId: '1', taskType: 'classify', input: 'hello' })).rejects.toThrow(
      "Adapter initialized for 'summarization'",
    );
  });
});
