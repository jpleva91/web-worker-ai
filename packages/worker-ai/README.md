# web-worker-ai

Generic browser-local AI worker orchestration for Angular/Nx apps.

This package is intentionally **domain-agnostic**. It does not know about any product-specific data model. It provides reusable primitives for running arbitrary local-AI tasks in a Web Worker with typed request/response correlation, lazy warmup, skip heuristics, validation, stale-result guards, fallbacks, and privacy-safe telemetry.

## What it is

- Angular service wrapper for worker-backed AI tasks.
- Worker warmup lifecycle: `idle`, `warming`, `ready`, `failed`, `skipped`.
- Runtime adapter seam for WebLLM, Transformers.js, Chrome built-in AI APIs, or app-provided workers.
- Built-in optional `TransformersJsWorkerAiAdapter` that dynamically imports `@huggingface/transformers` only when used.
- Fake adapter for tests and demos so CI never downloads model weights.
- Optional status component: `<wwai-worker-ai-status>`.

## What it is not

- Not a vertical-specific application package.
- Not a chatbot framework.
- Not a hard dependency on WebLLM, Transformers.js, or Gemini Nano.
- Not a server-side model gateway.
- Not a telemetry collector for prompts, inputs, or model outputs.

## Public API sketch

```ts
import {
  WorkerAiService,
  WorkerAiWarmupService,
  isBoundedString,
} from 'web-worker-ai';
```

Configure warmup in your app after the first meaningful render or route stabilization:

```ts
warmup.configure({
  createWorker: () => new Worker(new URL('./worker-ai.worker', import.meta.url), { type: 'module' }),
  telemetry: (event) => console.debug(event.name, event.properties),
});

void warmup.startAfterIdle();
```

Run a generic task with a fallback and optional stale guard:

```ts
const result = await workerAi.run<string, string>('summarize', inputText, {
  correlationKey: documentId,
  isCurrent: (key) => key === this.currentDocumentId,
  validate: isBoundedString(1, 500),
  fallback: () => deterministicSummary(inputText),
});
```

## Adapter strategy

The core package ships a fake adapter for deterministic CI/demo use and a built-in optional `TransformersJsWorkerAiAdapter`. The Transformers adapter uses a dynamic import for `@huggingface/transformers`, so applications install that dependency only when they choose that runtime.

```bash
pnpm add @huggingface/transformers
```

```ts
import { TransformersJsWorkerAiAdapter, createWorkerAiWorker } from 'web-worker-ai';

createWorkerAiWorker({
  adapter: new TransformersJsWorkerAiAdapter({
    task: 'summarization',
    model: 'Xenova/distilbart-cnn-6-6',
  }),
});
```

Recommended runtime paths:

- Transformers.js adapter for smaller task models and ONNX-backed browser inference.
- WebLLM recipe for broader instruction-following in browsers with WebGPU.
- Chrome built-in AI recipe when browser support and worker limitations fit the application.

## Privacy defaults

Telemetry event names and coarse error classes are allowed. Inputs, prompts, model outputs, document text, and task payloads are not logged by default.
