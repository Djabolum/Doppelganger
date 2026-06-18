# Quark-AI Integration

Quark-AI is optional. Doppelganger works fully offline without it — see
`docs/threat-model.md`. This document describes what *would* connect them,
what already exists today, and what is deliberately not built yet.

## What exists today (V1 MVP)

`doppel quark dry-run --type <kind> --id <id>` (see
`packages/cli/index.ts::cmdQuarkDryRun`):

- builds a `continuity_envelope` locally (`packages/core/policy.ts`)
- prints exactly what *would* be sent
- makes **no network call**

```
Would send:
- kind: fossil_trace
- id: fos_2b6e91d0c4a7
- raw_text_included: false
- authority: false
- target: Quark-AI

(dry run only — no network call was made)
```

`doppel quark deposit` exists as a command name, but
`packages/cli/index.ts::cmdQuarkDeposit` refuses to run it and exits 1,
pointing here and to `packages/adapters/quark/README.md`.

## Why a real deposit is deferred, not stubbed silently

A real deposit needs intake endpoints that do not exist yet on the Quark-AI
backend (`/opt/quark-ai`). Today, Quark's Nautilus API exposes
fossil-shaped endpoints (`/api/nautilus/fossils/fossilize`,
`/api/nautilus/fossils`, `/api/nautilus/fossils/{id}`,
`/api/nautilus/versions`) built around `fossil_type`, `source_prompt`,
`reasoning_traces`, `response_patterns`, `style_signature`, and related
fields. Posting a `memory_card` or a `handoff_card` straight into that shape
would blur four objects that `docs/doctrine.md` explicitly keeps apart:
fossil, memory card, handoff card, and receipt.

The intended shape, when this is built for real, is more explicit:

```
POST /api/quark/intake/memory-card
POST /api/quark/intake/boundary-card
POST /api/quark/intake/handoff-card
POST /api/quark/intake/fossil-trace
POST /api/quark/intake/trust-receipt
```

None of these exist on the Quark-AI side yet. Building them is a Quark-side
chantier, not a Doppelganger one — `packages/adapters/quark/` stays a
placeholder until that work happens.

## Planned mapping (for when the intake endpoints exist)

If the existing Nautilus fossil store is reused instead of new intake
routes, the mapping would be:

```
handoff_card  -> fossil_type = continuity_handoff
memory_card   -> fossil_type = memory_card
boundary_card -> fossil_type = boundary_card
fossil_trace  -> fossil_type = external_fossil_trace
trust_receipt -> fossil_type = trust_receipt
```

But every payload must carry a strict envelope, never folded into Quark's
own `decision_tree`:

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
`packages/core/policy.ts::buildContinuityEnvelope` — the same shape QPL
traces already use elsewhere on this VPS (`output != fossil`,
`memory != structure`, `observation != intervention`,
`contains_raw_user_text: false`, `decision_authority: false`,
`memory_authority: false`). The doctrine is not new; only the exposure is.

## What V1 deliberately does not include

- No HTTP client to Quark anywhere in `packages/adapters/quark/`.
- No `--confirm` path on `doppel quark deposit`.
- No `handoff_card.schema.json`, `fossil_trace.schema.json`, or
  `quark_deposit.schema.json` under `schemas/` — only the four V0 schemas
  (`manifest`, `card`, `context_pack`, `trust_receipt`) ship in V1, per the
  original MVP scope. These three are the natural next schemas once the
  Quark-side intake endpoints exist and the shapes are no longer
  speculative.
