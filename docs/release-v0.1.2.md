# Doppelganger v0.1.2 — V1.1 Frozen

A local-first continuity toolkit for user-approved context, handoffs,
receipts, and bounded Quark candidate validation. No network transport.

## Included

- installable `doppel` CLI
- local vault and validated cards
- scoped context packs
- bounded handoff cards and exports
- trust receipts and local revocation records
- validated Markdown/Notion-like card import
- Contract Doctor and deterministic contract fixtures
- candidate 0.3 local dry-run builder
- shared fixture and drift-guard compatibility

## Explicitly not included

- no network client
- no endpoint configuration
- no credential handling
- no cloud sync or AI-account connection
- no AI-to-AI autonomous transport
- no memory upload
- no live Quark deposit
- no real server receipt

Candidate 0.3 tools create or verify local files only. Network construction
and activation remain blocked by
`docs/network-activation-preconditions-v0.md`.

## Verification

```bash
npm test
npm audit
npm pack --dry-run
```

The packed tarball is also installed into an empty directory and verified
through `npx doppel --help` and `npx doppel doctor`.

Version `0.1.1` was not published to npm. The first registry publication was
bumped to `0.1.2` so the package metadata preserves the installed `doppel`
binary without npm normalization.
