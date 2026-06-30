/// <reference lib="webworker" />

import { ChromeSummarizerWorkerAiAdapter, createWorkerAiWorker } from 'web-worker-ai';

createWorkerAiWorker({
  adapter: new ChromeSummarizerWorkerAiAdapter({
    type: 'tl;dr',
    format: 'plain-text',
    length: 'short',
  }),
});
