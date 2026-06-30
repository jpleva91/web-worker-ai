# Tasks: Generic Web Worker Local-AI Runtime

## Completed implementation tasks

- [x] Corrected scope from domain-specific prompt example to generic Web Worker local-AI runtime.
- [x] Created generic NotebookLM source packet.
- [x] Created NotebookLM notebook `699365b8-bb8e-454f-b73e-7c105e1e179c` with 7 sources.
- [x] Ran sanity query and captured architecture decision.
- [x] Created Nx Angular workspace at `/home/red/projects/web-worker-ai`.
- [x] Initialized Spec Kit in the workspace.
- [x] Generated publishable Angular library `packages/worker-ai` with import path `@m3kit/worker-ai`.
- [x] Implemented core types, heuristics, validators, worker harness, Angular services, fake adapter, status component, README, and demo shell.
- [x] Added orchestration tests for `WorkerAiService`: fallback when not ready, request correlation, stale guard, validation fallback, and timeout/cancel.
- [x] Added warmup tests for `WorkerAiWarmupService`: disabled skip, init/ready transition, progress capture, and init error capture.
- [x] Added worker harness tests for `createWorkerAiWorker`: init/ready, task result correlation, cancellation suppression, and request-scoped errors.
- [x] Removed stale Nx welcome demo component and updated demo spec artifact.
- [x] Created Obsidian project index note with NotebookLM URL/source IDs and repo path.
- [x] Ran fresh review gate; initial verdict was BLOCK due to missing orchestration tests and stale task ledger/demo spec.
- [x] Resolved review blockers and reran local verification gates.

## Verification evidence — 2026-06-30

Commands run from `/home/red/projects/web-worker-ai`:

```bash
pnpm nx test worker-ai --skip-nx-cache
pnpm nx build worker-ai --skip-nx-cache
pnpm nx build demo --skip-nx-cache
grep -RniE '\b(product_specific_placeholder)\b' packages/worker-ai/src packages/worker-ai/README.md README.md docs/brief.md
```

Results:

- [x] `worker-ai` tests passed: 7 files, 24 tests.
- [x] `worker-ai` build passed: built `@m3kit/worker-ai`.
- [x] `demo` build passed with no Nx welcome CSS budget warning after deleting stale starter component.
- [x] Domain scan passed: no product-specific vocabulary in core package docs/source.

## Remaining gated action

- [ ] Ask Jared before `gh repo create` / first push.

## Approval-gated external action

Proposed command after Jared approval:

```bash
gh repo create jpleva91/web-worker-ai --public --source /home/red/projects/web-worker-ai --remote origin --push
```

No external repo creation or push should happen before approval.
