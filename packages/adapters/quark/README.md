# adapters/quark — deferred beyond V1 MVP

This adapter is the future bridge to Quark-AI
(`POST /api/quark/intake/continuity`).

**What exists today:** no executable network adapter. `doppel quark dry-run`
still builds its legacy envelope locally. The separate
`doppel contract build-quark-candidate` command can now write a candidate
0.3 deposit plus a dry-run manifest to user-selected local files, but it is
gated by the Contract Doctor and contains no transport capability.

**What is explicitly deferred, and why:** a real `doppel quark deposit
--confirm` requires a dedicated continuity intake that does not exist yet on
the Quark-AI backend — only
interfaces with a different semantic purpose are currently available.
Mapping straight into those would blur
fossil/memory-card/handoff-card/receipt into one bucket, which the doctrine
(`docs/quark-integration.md`) explicitly forbids. Building this adapter for
real is a bilateral contract effort.

See `docs/quark-intake-contract-v0.3.md` for the bilateral contract
candidate. No executable adapter is authorized before approval.
