# Quark-AI Integration

Quark-AI is optional. Doppelganger works fully offline without it. V1.1 is
frozen; the V2 receiving contract is specified before any network code.
See `docs/threat-model.md` for the local boundary.

The active V2 candidate is
`docs/quark-intake-contract-v0.3.md`. It requires a dedicated continuity
quarantine, scoped authentication, idempotency, status, bilateral receipts,
deletion/expiry receipts, and a deny-by-default capability model; it is not
a wrapper around `/fossils`.

## Current V2.0-prep status

A local Quark-side continuity intake skeleton exists for validation and
quarantine behavior only.

It provides:

- strict candidate 0.3 schema validation
- fail-closed validation before storage
- a dedicated SQLite `continuity_quarantine`
- idempotency handling
- local create, status, delete, and expiry flows
- status responses without projection content
- bounded deposit, deletion, and expiry receipts
- credential scope, TTL, and revocation checks
- a feature flag closed by default

It does not provide:

- an HTTP route
- a public or internal network endpoint
- live Doppelganger-to-Quark deposits
- runtime or production activation
- fossilization, indexing, automation, memory, or project linkage

The local skeleton proves receiver behavior only. It does not authorize
transport. Quark Intake local skeleton exists; network deposit remains
unauthorized.

## Candidate 0.3 compatibility

Doppelganger's candidate 0.3 example payload is accepted unchanged by the
Quark local validator. Both sides compute the same canonical content hash
and artifact size.

This is a local contract compatibility proof only. The network adapter
remains unauthorized.

The stable fixture bundle can be exported explicitly for local bilateral
contract tests:

```bash
npm run export:quark-contract-fixture -- --output <directory>
```

The exporter writes a deterministic candidate 0.3 payload plus an integrity
manifest. It does not contact Quark and is not a `doppel quark deposit`
implementation.

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

## Why a network deposit is deferred, not stubbed silently

A live deposit needs a network intake surface that is not authorized or
registered in the Quark-AI runtime. Reusing an existing generic or
fossil-oriented storage interface would blur four objects that
`docs/doctrine.md` explicitly keeps apart: fossil, memory card, handoff
card, and receipt.

The intended V2 shape is one explicit continuity intake:

```
POST /api/quark/intake/continuity
```

It receives a `continuity_deposit`, validates the non-authority policy, and
stores it in a continuity quarantine. It returns a server receipt that
Doppelganger pairs with its local receipt.

No public, internal, or runtime HTTP endpoint exists yet. A local Quark-side
intake skeleton exists behind a disabled feature flag, but it must not be
exposed as a network route until all non-capture gates pass.

Network enablement remains a bilateral Quark/Doppelganger effort.
`packages/adapters/quark/` stays a placeholder until the contract and gates
are approved, then implemented and tested on both sides.

The receiving resource must use a namespace separate from fossils, memories,
projects, automation, semantic indexing, and activation.

## No storage compatibility shortcut

Continuity objects must not be translated into another storage vocabulary
merely to reuse an available endpoint. That would make the distinction
`continuity_deposit != fossil` cosmetic instead of structural.

Every candidate 0.3 deposit must carry a strict policy, never folded into
Quark's own `decision_tree`:

```json
{
  "source": "doppelganger",
  "policy": {
    "authority": false,
    "memory_authority": false,
    "decision_authority": false,
    "activation_allowed": false,
    "raw_conversation_included": false,
    "user_approved_projection_included": true,
    "revocable": true,
    "fossil_derivation_allowed": false,
    "semantic_indexing_allowed": false
  }
}
```

`user_approved_projection_included: true` means only that the deposit
contains a bounded projection explicitly approved by the user. It grants no
projection-read, memory, indexing, fossilization, activation, or future-use
capability.

The V1 dry-run still prints its legacy local `continuity_envelope` with
`card_content_included`. That preview is not the candidate 0.3 network
shape. Before a network adapter can exist, Doppelganger must build and
validate the candidate 0.3 policy and consent object explicitly.

Both shapes preserve the public doctrine: `output != fossil`,
`memory != structure`, `observation != intervention`.

## What V1 deliberately does not include

- No HTTP client to Quark anywhere in `packages/adapters/quark/`.
- No `--confirm` path on `doppel quark deposit`.
- No live transport or network authorization follows from the presence of a
  schema or receiver skeleton.
- The V2 continuity deposit and receipt schemas exist as strict candidate
  0.3 shapes for local validation and bilateral review. They are not yet
  authorized for network exposure.
- `fossil_trace` remains constrained as a local card by `card.schema.json`;
  only its bounded candidate 0.3 projection shape may enter the local Quark
  validator.
- `handoff_card.schema.json` ships because handoffs are already a stable
  local/exported object.
