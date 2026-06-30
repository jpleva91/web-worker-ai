/// <reference lib="webworker" />

import { createWorkerAiWorker, TransformersJsPipelineFactory, TransformersJsWorkerAiAdapter } from 'web-worker-ai';
import { pipeline } from '@huggingface/transformers';

const pipelineFactory = pipeline as unknown as TransformersJsPipelineFactory;

createWorkerAiWorker({
  adapter: new TransformersJsWorkerAiAdapter({
    task: 'summarization',
    model: 'Xenova/distilbart-cnn-6-6',
    pipelineOptions: {
      dtype: 'q8',
    },
    pipelineFactory,
  }),
});
