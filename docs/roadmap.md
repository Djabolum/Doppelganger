# Roadmap

The roadmap follows one rule: widen circulation only after the previous
boundary has been proven in real use.

## V1 — Local Doppelganger

Goal: create, bound, and export an intention under explicit user control.

Delivered:

- local cards and vault
- scoped context packs
- handoff cards
- trust receipts and local revocation
- no scraping, background synchronization, or default upload

## V1.1 — Writing usability and Markdown compatibility

Goal: make the local product comfortable to use without turning a writing
surface into an authority source.

Delivered field hardening:

- `doppel doctor`
- explicit Markdown and JSON exports
- receiving profiles for ChatGPT, Claude, Gemini, and unknown targets
- readable receipt detail
- clearer errors, examples, and field cases

Next bounded addition:

- import human-authored cards from simple Markdown files
- accept exports from Notion-like writing tools without connecting to their
  accounts
- preview and validate every conversion before it enters the vault
- reject unknown fields and unsupported object kinds
- create canonical IDs, policy fields, and timestamps inside Doppelganger

The intended flow is:

```text
Notion-like Markdown file
  -> doppel card import --from markdown --file <path> --dry-run
  -> Doppelganger validation and policy
  -> canonical local card
```

The draft Markdown boundary is in `docs/markdown-card-import.md`.

Notion content is not a valid continuity object by itself. V1.1 adds no
Notion API, synchronization, account connection, or network capability.

Local vault safety remains a V1-series gate before broad non-technical
adoption. Plaintext status and warnings come before any encryption claim;
encryption ships only after a reviewed key-lifecycle and recovery design.

## V2 — Quark Gîte Intake

Goal: deposit a controlled trace into a host, receive bilateral evidence,
revoke it through an explicit lifecycle, and observe it without transferring
ownership or authority.

V2 is not a generic upload and is not `POST /fossils`. It requires a
dedicated bilateral contract:

```text
Doppelganger vault
  -> scoped projection
  -> continuity_deposit
  -> POST /api/quark/intake/continuity
  -> Quark policy validation and quarantine
  -> Quark server receipt
  -> Doppelganger local receipt
  -> optional, separately approved fossil derivation
```

The draft contract is in `docs/quark-intake-contract-v0.1.md`.

## V2.1 — Circulation hardening

- richer target capability profiles
- explicit transformation history
- bilateral receipt comparison
- expiry and supersession semantics
- remote revocation/deletion status that never overclaims recall
- no assistant-to-assistant background communication

## V3 — Interfaces

Interfaces come only after the local object model and Quark transport
contract are stable:

- browser extension
- official Notion adapter
- MCP adapter

Each interface remains subordinate to the same validation boundary. The
browser extension is governed by `docs/browser-extension-policy.md`; the
Notion adapter may read or write documents but cannot promote them directly
into valid continuity objects; the MCP adapter exposes only explicit,
scoped projections.

```text
Writing surface -> Doppelganger policy -> approved destination
Notion          -> Doppelganger policy -> Quark host
```

The roles stay distinct:

- Notion writes.
- Doppelganger bounds.
- Quark hosts.
