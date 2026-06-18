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
- Optionally deposit selected traces into Quark-AI

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
  --label "Style de réponse" \
  --content "Répondre en couches, éviter les réponses génériques."

node dist/packages/cli/index.js card add boundary \
  --label "Non-diagnostic" \
  --content "transformer mes traces ou émotions en diagnostic"

node dist/packages/cli/index.js context build --scope minimal --target claude

node dist/packages/cli/index.js status
```

Once installed globally (or linked), the same commands run as `doppel init`,
`doppel card add ...`, `doppel context build ...`.

See `examples/minimal/` for the manifest, cards, and context pack this
produces, and `docs/scopes.md` for what each scope includes.

## Status

V1 MVP: `packages/core`, `packages/cli`, the four V0 `schemas/`, `examples/`,
and `docs/`. Deferred and explicitly tracked (not silently dropped):
`packages/browser-extension/`, `packages/adapters/mcp/`, a real
`packages/adapters/quark/` deposit, vault encryption, and the cross-AI
observatory. See `CHANGELOG.md` for the full breakdown.

## Contributing

See `CONTRIBUTING.md` before opening a PR — it lists what gets rejected
(silent scraping, default uploads, authoritative memory, hidden
agentivity) regardless of code quality.

## Security

See `SECURITY.md` to report a vulnerability, and `docs/threat-model.md`
for what this project does and does not do by design.

## License

Apache License 2.0 — see `LICENSE`.