# adapters/quark — deferred beyond V1 MVP

This adapter is the future bridge to Quark-AI (`POST /api/quark/intake/*`).

**What exists today:** nothing executable. `doppel quark dry-run` lives in
`packages/cli/index.ts` and builds the deposit envelope (see
`packages/core/policy.ts::buildContinuityEnvelope`) entirely **locally** — no
network call, no Quark dependency. It is a preview only.

**What is explicitly deferred, and why:** a real `doppel quark deposit
--confirm` requires intake endpoints (`POST /api/quark/intake/memory-card`,
`/boundary-card`, `/handoff-card`, `/fossil-trace`, `/trust-receipt`) that do
not exist yet on the Quark-AI backend (`/opt/quark-ai`) — only
`/api/nautilus/fossils/fossilize` and friends exist today, and mapping
straight into those would blur fossil/memory-card/handoff-card/receipt into
one bucket, which the doctrine (`docs/quark-integration.md`) explicitly
forbids. Building this adapter for real is a separate, Quark-side chantier.

See `docs/quark-integration.md` for the full mapping plan.
