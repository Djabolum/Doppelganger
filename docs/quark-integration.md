# Quark-AI Integration

Quark-AI is optional. Doppelganger works fully offline without it — see
`docs/threat-model.md`. This document describes what *would* connect them,
what already exists today, and what is deliberately not built yet.

The minimal V2 contract is drafted in
`docs/quark-intake-contract-v0.1.md`. It requires a dedicated continuity
quarantine and bilateral receipts; it is not a wrapper around `/fossils`.

## What exists today (V1 MVP)

`doppel quark dry-run --type <kind> --id <id>` (see
`packages/cli/index.ts::cmdQuarkDryRun`):

- builds a `continuity_envelope` locally (`packages/core/policy.ts`)
- prints the exact artifact and envelope that *would* be sent
- makes **no network call**

```
Exact payload preview:
{
  "kind": "fossil_trace",
  "artifact": { "...": "the complete local artifact" },
  "continuity_envelope": { "authority": false, "...": "..." },
  "target": "Quark-AI"
}

(dry run only — no network call was made)
```

`doppel quark deposit` exists as a command name, but
`packages/cli/index.ts::cmdQuarkDeposit` refuses to run it and exits 1,
pointing here and to `packages/adapters/quark/README.md`.

## Why a real deposit is deferred, not stubbed silently

A real deposit needs intake endpoints that do not exist yet on the Quark-AI
backend. Reusing an existing generic or fossil-oriented storage interface
would blur four objects that `docs/doctrine.md` explicitly keeps apart:
fossil, memory card, handoff card, and receipt.

The intended V2 shape is one explicit continuity intake:

```
POST /api/quark/intake/continuity
```

It receives a `continuity_deposit`, validates the non-authority policy, and
stores it in a continuity quarantine. It returns a server receipt that
Doppelganger pairs with its local receipt.

This endpoint does not exist on the Quark-AI side yet. Building it is a
bilateral Quark/Doppelganger effort — `packages/adapters/quark/` stays a
placeholder until that contract is implemented and tested on both sides.

## No storage compatibility shortcut

Continuity objects must not be translated into another storage vocabulary
merely to reuse an available endpoint. That would make the distinction
`continuity_deposit != fossil` cosmetic instead of structural.

Every deposit must carry a strict envelope, never folded into Quark's own
`decision_tree`:

```json
{
  "continuity_envelope": {
    "authority": false,
    "memory_authority": false,
    "decision_authority": false,
    "activation_allowed": false,
    "raw_text_included": false,
    "revocable": true,
    "source": "doppelganger"
  }
}
```

This mirrors the envelope already produced locally by
`packages/core/policy.ts::buildContinuityEnvelope` and preserves the public
doctrine: `output != fossil`, `memory != structure`,
`observation != intervention`.

## What V1 deliberately does not include

- No HTTP client to Quark anywhere in `packages/adapters/quark/`.
- No `--confirm` path on `doppel quark deposit`.
- No separate `fossil_trace.schema.json` or `continuity_deposit.schema.json`
  exists yet. Fossils are currently constrained by `card.schema.json`;
  the network deposit schema remains a reviewed draft until Quark-side
  intake exists. `handoff_card.schema.json` now ships because handoffs are
  already a stable local/exported object.
