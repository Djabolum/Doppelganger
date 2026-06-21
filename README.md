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
- Import validated Markdown/Notion-like card drafts
- Build bounded candidate 0.3 files for local verification
- Inspect contract identity, hashes, size, and drift locally

## What it does not do

- It does not connect your AI accounts
- It does not scrape conversations
- It does not contain a network client or upload path
- It does not configure an endpoint or credential
- It does not perform a live Quark deposit
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
npm install --global @djabolum/doppelganger

doppel init

doppel card add memory \
  --label "Response style" \
  --content "Answer in layers, avoid generic replies."

doppel card add boundary \
  --label "No diagnosis" \
  --content "Do not turn my traces or emotions into a diagnosis."

# `fossil` is the short CLI alias for the internal kind `fossil_trace`.
# Fossil traces carry a short pattern label, never narrative `--content`.
doppel card add fossil \
  --label "Trace de passage"

# Validate a Markdown card file you created or exported locally
doppel card import \
  --from markdown \
  --file ./cards.md \
  --dry-run

doppel context build --scope minimal --target claude
doppel context build --scope minimal --target chatgpt --format json

doppel status
doppel doctor

# Remove a local card while keeping a revocation audit record
doppel card revoke --id <card_id>
```

For repository development, use `npm install`, `npm run build`, and
`node dist/packages/cli/index.js ...`.

See `examples/minimal/` for the manifest, cards, and context pack this
produces, `docs/field-cases.md` for realistic usage paths, and
`docs/scopes.md` for what each scope includes.

## Status — V1.1 frozen

**Doppelganger V1.1 is frozen as a local-first continuity kit with validated
Markdown/Notion-like import.** See `docs/v1.1-freeze.md`.

The vault validates every object again when it is read, uses private
filesystem permissions (`0700` directories, `0600` files), records every
context/handoff export, and exposes explicit local revocation commands.

V1.1 adds field diagnostics, explicit Markdown/JSON exports, readable
receipt detail, receiving profiles for ChatGPT, Claude, Gemini, and generic
assistants, and a strict local Markdown importer. Notion-like exports enter
only through Doppelganger validation; the boundary is documented in
`docs/markdown-card-import.md`.

Candidate 0.3 tooling is local verification only. The Contract Doctor,
fixture exporter, and `doppel contract build-quark-candidate` command write
or inspect local files; they do not contact Quark. `doppel quark deposit`
remains an explicit refusal.

Network construction and activation remain blocked by
`docs/network-activation-preconditions-v0.md`.

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
receipts, revocation, filesystem permissions, CLI flag validation, local
candidate construction, and contract drift.

## License

Apache License 2.0 — see `LICENSE`.
