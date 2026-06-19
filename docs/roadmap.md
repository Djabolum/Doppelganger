# Roadmap

The roadmap follows one rule: widen circulation only after the previous
boundary has been proven in real use.

## V1.1 — Field hardening

Goal: prove the local product is understandable and dependable outside its
own implementation session.

- use the CLI on 5–10 real continuity cases
- `doppel doctor`
- explicit Markdown and JSON exports
- receiving profiles for ChatGPT, Claude, Gemini, and unknown targets
- readable receipt detail
- clearer errors and examples

No network capability is added in V1.1.

## V1.2 — Vault safety

Goal: reduce local plaintext risk without claiming false security.

Minimum honest milestone:

- `doppel vault status`
- explicit plaintext warning
- secret-detection guardrails
- repository/gitignore checks

Optional stronger milestone, only with a reviewed cryptographic design:

- `doppel vault encrypt`
- `doppel vault unlock`
- `doppel vault lock`

Environment-key encryption (`DOPPELGANGER_VAULT_KEY`) is not automatically
considered safe: key lifecycle, nonce handling, authenticated encryption,
backup, recovery, and locked-memory behavior must be designed first.

## V2.0 — Quark Intake

Goal: make continuity cross a system boundary without becoming captured
memory or authority.

V2 is not `POST /fossils`. It requires a dedicated bilateral contract:

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

## V2.1 — Cross-AI handoff improvements

- richer target capability profiles
- explicit transformation history
- bilateral receipt comparison
- expiry and supersession semantics
- no assistant-to-assistant background communication

## V3.0 — Browser extension

The extension comes after the transport protocol is stable. It remains a
manual user surface governed by `docs/browser-extension-policy.md`, never a
background observer or account connector.
