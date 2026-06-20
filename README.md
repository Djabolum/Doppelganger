# Doppelganger

A local-first continuity toolkit for carrying user-approved AI context between assistants.

Doppelganger is not a clone of you.  
It is a reflection of the intention you choose to convey.

It does not connect your AI accounts.  
It does not scrape conversations.  
It does not upload by default.  
It does not act on your behalf.

It prepares contexts, boundaries, and exchanges that you choose to share with an AI.

## What it does

- Create local context cards
- Build scoped context packs
- Prepare handoff cards between AI assistants
- Write trust receipts
- Preview (dry-run only, no network call) what an optional deposit into
  Quark-AI would contain — a real deposit is not implemented yet, see
  Status below

## What it does not do

- It does not connect your AI accounts
- It does not scrape conversations
- It does not upload by default
- It does not create an autonomous agent
- It does not treat memory as truth

## Core invariants

- Doppelganger ≠ user
- Context ≠ identity
- Memory ≠ authority
- Handoff ≠ command
- Host ≠ owner

See `docs/doctrine.md` for the full list of ten invariants.

## Quickstart

```bash
npm install
npm run build

node dist/packages/cli/index.js init

node dist/packages/cli/index.js card add memory \
  --label "Response style" \
  --content "Answer in layers, avoid generic replies."

node dist/packages/cli/index.js card add boundary \
  --label "No diagnosis" \
  --content "turn my traces or emotions into a diagnosis"

# `fossil` is the short CLI alias for the internal kind `fossil_trace`.
# Fossil traces carry a short pattern label, never narrative `--content`.
node dist/packages/cli/index.js card add fossil \
  --label "Trace de passage"

node dist/packages/cli/index.js card import \
  --from markdown \
  --file ./examples/notion-like/cards.md \
  --dry-run

node dist/packages/cli/index.js context build --scope minimal --target claude
node dist/packages/cli/index.js context build --scope minimal --target chatgpt --format json

node dist/packages/cli/index.js status
node dist/packages/cli/index.js doctor

# Remove a local card while keeping a revocation audit record
node dist/packages/cli/index.js card revoke --id <card_id>
```

Once installed globally (or linked), the same commands run as `doppel init`,
`doppel card add ...`, `doppel context build ...`.

See `examples/minimal/` for the manifest, cards, and context pack this
produces, `docs/field-cases.md` for eight realistic usage paths, and
`docs/scopes.md` for what each scope includes.

## Status

V1 MVP: `packages/core`, `packages/cli`, the V0 `schemas/`, `examples/`,
and `docs/`. Deferred and explicitly tracked (not silently dropped):
`packages/browser-extension/`, `packages/adapters/mcp/`, a real
`packages/adapters/quark/` deposit, vault encryption, and the cross-AI
observatory. See `CHANGELOG.md` for the full breakdown.

The vault validates every object again when it is read, uses private
filesystem permissions (`0700` directories, `0600` files), records every
context/handoff export, and exposes explicit local revocation commands.

V1.1 adds field diagnostics, explicit Markdown/JSON exports, readable
receipt detail, receiving profiles for ChatGPT, Claude, Gemini, and generic
assistants, and a strict local Markdown importer. Notion-like exports enter
only through Doppelganger validation; the boundary is documented in
`docs/markdown-card-import.md`.

V2 remains intentionally blocked until Quark exposes a dedicated continuity
intake. See `docs/quark-intake-contract-v0.1.md`; Doppelganger will not map
continuity into an unrelated storage interface.

The long-term layering is deliberate: writing surfaces write, Doppelganger
bounds, and receiving hosts receive. Official Notion, browser, and MCP
interfaces remain V3 work, after the transport contract is stable.

Because this repository is public, documentation follows
`docs/publication-policy.md`: public contracts and guarantees are documented;
private deployment topology is not.

## Contributing

See `CONTRIBUTING.md` before opening a PR — it lists what gets rejected
(silent scraping, default uploads, authoritative memory, hidden
agentivity) regardless of code quality.

## Security

See `SECURITY.md` to report a vulnerability, and `docs/threat-model.md`
for what this project does and does not do by design.

## Verification

```bash
npm test
```

The suite covers vault tampering, malformed JSON, scope isolation, mandatory
receipts, revocation, filesystem permissions, CLI flag validation, and exact
Quark dry-run disclosure.

## License

Apache License 2.0 — see `LICENSE`.
