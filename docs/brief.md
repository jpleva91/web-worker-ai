# Web Worker AI Brief

## One-line thesis

`web-worker-ai` is a generic Angular/Nx library for running browser-local AI tasks in a Web Worker without coupling an app to a specific model runtime or a product domain.

## What it solves

Frontend teams increasingly want local AI features—summarization, rewriting, extraction, classification, and custom text tasks—without blocking page rendering, leaking data to a hosted model by default, or hard-wiring a heavy runtime into the main bundle. This library provides the reusable control plane for that pattern.

## What ships in v0.1

- **Generic task protocol**: `taskType`, `input`, `options`, `requestId`, and `correlationKey`.
- **Angular orchestration service**: `WorkerAiService` handles routing, timeout, validation, fallback, and stale-result protection.
- **Warmup lifecycle service**: `WorkerAiWarmupService` manages `idle`, `warming`, `ready`, `failed`, and `skipped` states.
- **Worker-side harness**: `createWorkerAiWorker(...)` wraps runtime adapters and emits progress, ready, result, and error messages.
- **Runtime adapter seam**: WebLLM, Transformers.js, Chrome built-in AI, or app-specific adapters can plug in.
- **Transformers.js adapter**: built-in optional adapter that dynamically imports `@huggingface/transformers` only when used.
- **Fake adapter**: CI/demo-safe adapter so tests do not download model weights.
- **Status component**: optional `<wwai-worker-ai-status>` UI for passive local-AI readiness.
- **Spec Kit artifacts**: source-grounded spec, plan, task ledger, and approval queue.

## What it explicitly does not do

- No vertical-specific API.
- No product-specific data model in the core package.
- No bundled model weights.
- No default server-side model endpoint.
- No prompt/input/output telemetry by default.
- No hard dependency on WebLLM, Transformers.js, or Chrome AI.

## Architecture

```text
Angular App
  -> WorkerAiWarmupService
      -> skip heuristics: disabled / Save-Data / slow connection / low storage / unsupported worker
      -> lazy worker init after idle/render
  -> WorkerAiService
      -> task request + requestId + correlationKey
      -> timeout / cancel
      -> validation / stale guard / fallback
  -> Web Worker Harness
      -> RuntimeAdapter.init()
      -> RuntimeAdapter.runTask()
      -> ready / progress / result / error messages
  -> Optional runtime recipes
      -> WebLLM
      -> Transformers.js
      -> Chrome built-in AI
      -> custom app adapter
```

## Verification evidence

Run from `/home/red/projects/web-worker-ai`:

```bash
pnpm nx test worker-ai --skip-nx-cache
pnpm nx build worker-ai --skip-nx-cache
pnpm nx build demo --skip-nx-cache
```

Latest local result:

- `worker-ai` tests: **8 files passed, 27 tests passed**.
- `worker-ai` build: **passed**, built `web-worker-ai`.
- `demo` build: **passed**.
- Domain scan: **clean for product-specific vocabulary in core package docs/source**.

## NotebookLM research

Notebook:

https://notebooklm.google.com/notebook/699365b8-bb8e-454f-b73e-7c105e1e179c

Sources included WebLLM docs, Transformers.js docs, Chrome built-in Summarizer API docs, MDN Web Workers, MDN StorageManager estimate, MDN Save-Data, and the generic project source packet.

## Recommended next steps

1. Add a live Transformers.js demo route behind explicit opt-in so regular CI/demo builds still avoid model downloads.
2. Add a WebLLM adapter/recipe for broader instruction-following in WebGPU browsers.
3. Add package publish metadata once npm naming is final.
