# Feature Specification: Generic Web Worker Local-AI Runtime

**Feature Branch**: `001-generic-web-worker-ai`  
**Created**: 2026-06-30  
**Status**: Draft  
**Input**: Jared corrected the scope: build a generic Web Worker local-AI Nx library, not a domain-specific app library.

## User Scenarios & Testing

### Primary User Story

As an Angular/Nx application developer, I want a liftable library that runs browser-local AI tasks in a Web Worker through pluggable runtime adapters, so I can add local summarization/rewrite/extraction/classification features without blocking rendering, coupling to one model runtime, or sending user payloads to a hosted model by default.

### Acceptance Scenarios

1. **Generic runtime orchestration**: Given an app configures a worker runtime adapter, when it submits a `summarize`, `rewrite`, `extract-json`, `classify`, or custom task, then the library correlates the request and response by `requestId` without any domain-specific assumptions.
2. **Non-blocking warmup**: Given an Angular page has rendered, when the app calls `startAfterIdle()`, then model/worker initialization begins after idle timing and never blocks bootstrap or initial render.
3. **Fallback first**: Given the worker is not ready, fails, times out, or returns invalid output, when a task has a fallback, then the fallback result is returned.
4. **Stale guard**: Given a task response returns after the UI has moved to a different correlation key, then the result is discarded and fallback behavior is used.
5. **Skip heuristics**: Given Save-Data, slow connection, unsupported Worker API, low storage, or explicit disablement, then warmup is skipped with a reason.
6. **Domain isolation**: Given a clean checkout, when tests inspect the core package, then no product-specific API exists in source code or public docs.

## Requirements

### Functional Requirements

- **FR-001**: Expose generic task types and allow custom task type strings.
- **FR-002**: Expose a `RuntimeAdapter` interface with `init`, `runTask`, and optional `dispose` lifecycle.
- **FR-003**: Expose an Angular `WorkerAiWarmupService` for lazy warmup state and progress.
- **FR-004**: Expose an Angular `WorkerAiService` for request routing, timeout, validation, fallback, and stale guard handling.
- **FR-005**: Expose a worker-side `createWorkerAiWorker` harness for adapter execution.
- **FR-006**: Include a fake adapter for tests and demos; no CI model downloads.
- **FR-007**: Include skip heuristics for Save-Data, slow connection, low storage, unsupported worker, and explicit disablement.
- **FR-008**: Include privacy-safe telemetry hooks that do not log inputs, prompts, or outputs by default.
- **FR-009**: Include an optional Angular status component for warmup state display.
- **FR-010**: Include README guidance for WebLLM, Transformers.js, and Chrome built-in AI as optional adapters/recipes.

### Non-Goals

- No vertical-specific or product-specific API in the core package.
- No hard dependency on WebLLM, Transformers.js, or Chrome built-in AI in v0.1 core.
- No server-side AI endpoint.
- No bundled model weights.
- No chatbot framework.

## Success Criteria

- `pnpm nx test worker-ai` passes.
- `pnpm nx build worker-ai` passes.
- `pnpm nx build demo` passes.
- Core source is generic and public API imports from `web-worker-ai`.
- README states generic scope and privacy defaults.
- NotebookLM research packet exists and is cited in Obsidian project index.

## Research Evidence

NotebookLM notebook: `https://notebooklm.google.com/notebook/699365b8-bb8e-454f-b73e-7c105e1e179c`

Sources include generic source packet, WebLLM docs, Transformers.js docs, Chrome Summarizer API docs, MDN Web Workers, MDN StorageManager estimate, and MDN Save-Data.
