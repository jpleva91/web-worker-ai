# web-worker-ai

Generic browser-local AI worker orchestration for Angular/Nx apps.

> Status: v0.1 local scaffold. Public repo source for a liftable Angular/Nx package.

## Why

Use this when an app wants local AI features—summarization, rewriting, extraction, classification, or custom text tasks—without blocking rendering, sending payloads to a hosted model by default, or coupling the core bundle to one heavy model runtime.

## Package

```ts
import {
  WorkerAiService,
  WorkerAiWarmupService,
  createWorkerAiWorker,
  TransformersJsWorkerAiAdapter,
  FakeWorkerAiAdapter,
} from 'web-worker-ai';
```

## Docs

- [Brief](docs/brief.md)
- [Architecture diagram](docs/architecture.html)
- [Spec](specs/001-generic-web-worker-ai/spec.md)
- [Plan](specs/001-generic-web-worker-ai/plan.md)
- [Tasks / evidence](specs/001-generic-web-worker-ai/tasks.md)
- [Transformers.js adapter](packages/worker-ai/README.md#adapter-strategy)

## Local verification

```bash
pnpm nx test worker-ai --skip-nx-cache
pnpm nx build worker-ai --skip-nx-cache
pnpm nx build demo --skip-nx-cache
```

Latest local evidence:

- `worker-ai` tests: 8 files passed, 27 tests passed.
- `worker-ai` build: passed.
- `demo` build: passed.
- Domain scans clean.

## Scope boundary

This package is generic infrastructure. It does not ship a product-specific data model and does not bundle model weights.
