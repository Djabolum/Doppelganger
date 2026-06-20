# adapters/quark — deferred beyond V1 MVP

This adapter is the future bridge to Quark-AI
(`POST /api/quark/intake/continuity`).

**What exists today:** nothing executable. `doppel quark dry-run` lives in
`packages/cli/index.ts` and builds the deposit envelope (see
`packages/core/policy.ts::buildContinuityEnvelope`) entirely **locally** — no
network call, no Quark dependency. It is a preview only.

**What is explicitly deferred, and why:** a real `doppel quark deposit
--confirm` requires a dedicated continuity intake that does not exist yet on
the Quark-AI backend — only
interfaces with a different semantic purpose are currently available.
Mapping straight into those would blur
fossil/memory-card/handoff-card/receipt into one bucket, which the doctrine
(`docs/quark-integration.md`) explicitly forbids. Building this adapter for
real is a bilateral contract effort.

See `docs/quark-intake-contract-v0.2.md` for the bilateral contract
candidate. No executable adapter is authorized before approval.
