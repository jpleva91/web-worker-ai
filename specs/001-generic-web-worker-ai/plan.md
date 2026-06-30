# Implementation Plan: Generic Web Worker Local-AI Runtime

**Branch**: `001-generic-web-worker-ai` | **Date**: 2026-06-30 | **Spec**: `specs/001-generic-web-worker-ai/spec.md`

## Summary

Build a generic Angular/Nx library package, `@m3kit/worker-ai`, that gives consumers a typed Web Worker local-AI orchestration layer. The v0.1 implementation is adapter-first: it provides protocols, services, warmup state, heuristics, validation/fallback/stale-guard logic, fake adapter, status component, tests, and docs. Heavy runtimes such as WebLLM and Transformers.js remain optional recipes to keep the core package liftable.

## Technical Context

- Nx 23 / Angular 21 workspace.
- Publishable Angular library under `packages/worker-ai`.
- Demo Angular app under `apps/demo`.
- Vitest Angular unit tests.
- Spec Kit artifacts under `specs/001-generic-web-worker-ai`.
- NotebookLM research notebook: `699365b8-bb8e-454f-b73e-7c105e1e179c`.

## Constitution Check

- Library-first and generic: PASS.
- No product-specific API: REQUIRED.
- Local-only verification before external repo actions: REQUIRED.
- External GitHub repo creation/push: GATED for Jared approval.

## Project Structure

```text
packages/worker-ai/
  src/lib/types.ts
  src/lib/heuristics.ts
  src/lib/validators.ts
  src/lib/create-worker-ai-worker.ts
  src/lib/worker-ai-warmup.service.ts
  src/lib/worker-ai.service.ts
  src/lib/fake-worker-ai-adapter.ts
  src/lib/worker-ai/*
apps/demo/src/app/*
specs/001-generic-web-worker-ai/*
```

## Verification Gates

1. `pnpm nx test worker-ai`
2. `pnpm nx build worker-ai`
3. `pnpm nx build demo`
4. Product-vocabulary scan over `packages/worker-ai/src`, `packages/worker-ai/README.md`, and root docs should be clean except framework syntax or Spec Kit tooling internals.
5. Git status reviewed before any external action.

## Phase Plan

### Phase 1 — Scope correction and research

- Create generic source packet.
- Create NotebookLM notebook and ingest official sources.
- Run NotebookLM sanity query.

### Phase 2 — Spec Kit and scaffold

- Initialize Nx workspace.
- Initialize Spec Kit.
- Generate publishable Angular library.
- Write spec and plan.

### Phase 3 — Core implementation

- Add public types and worker protocol.
- Add skip heuristics.
- Add validators.
- Add worker harness.
- Add Angular warmup and task services.
- Add fake adapter and status component.

### Phase 4 — Tests, docs, demo

- Add unit tests for heuristics, validators, fake adapter, status component.
- Add README with generic scope and privacy defaults.
- Replace demo with domain-agnostic text task example.

### Phase 5 — Review and gated publish

- Run verification gates.
- Prepare repo creation/push command for approval only after local green.
