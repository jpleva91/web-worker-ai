/// <reference lib="webworker" />

import { createWorkerAiWorker, FakeWorkerAiAdapter } from 'web-worker-ai';

createWorkerAiWorker({
  adapter: new FakeWorkerAiAdapter(),
});
