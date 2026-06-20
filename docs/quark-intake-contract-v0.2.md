# Quark Gîte Intake Contract — Candidate 0.2

Status: **specification candidate; implementation is not authorized yet**.

This contract defines Quark as a receiving host for bounded continuity.
Receiving does not grant ownership, memory authority, activation authority,
or permission to derive a fossil.

## V2.0 acceptance boundary

The first implementation accepts only:

- `handoff_card`
- `fossil_trace`

It rejects direct deposits of `memory_card`, `boundary_card`,
`project_card`, `context_pack`, raw conversations, prompts, chat histories,
and unknown payload kinds.

## Resource model

A `continuity_deposit` is a distinct resource. It must not be stored in a
fossil, memory, project, decision-tree, semantic-search, resurrection, or
automation namespace.

Lifecycle:

```text
request -> rejected (no resource created)
request -> quarantined -> deletion_pending -> deleted
                       \-> expired
```

`quarantined` means the bounded projection is stored but inactive. It does
not mean fossilized, indexed, remembered, or activated.

## Authentication and replay protection

The caller must use a credential scoped to continuity intake. A general
account credential or private service credential must not be embedded in
Doppelganger configuration.

Every create request requires:

```http
Authorization: Bearer <continuity-scoped credential>
Idempotency-Key: <stable random request id>
Content-Type: application/json
```

The same idempotency key and content hash must return the same deposit and
receipt. Reusing the key with different content must return `409 Conflict`.

## Create deposit

```http
POST /api/quark/intake/continuity
```

```json
{
  "schema_version": "0.2",
  "kind": "continuity_deposit",
  "source": "doppelganger",
  "payload_kind": "handoff_card",
  "projection": {
    "artifact": {
      "id": "hnd_...",
      "schema_version": "0.1",
      "kind": "handoff_card",
      "topic": "Bounded transfer",
      "from_surface": "chatgpt",
      "target_surface": "quark",
      "status": "open",
      "decisions": [
        {
          "text": "Preserve the non-capture boundary.",
          "confidence": "high",
          "authority": false
        }
      ],
      "open_questions": [],
      "boundaries": ["Do not activate or fossilize this handoff."],
      "usable_as": "context_only",
      "created_at": "2026-06-20T00:00:00Z"
    },
    "content_hash": "sha256:<canonical-json-hash>"
  },
  "policy": {
    "authority": false,
    "memory_authority": false,
    "decision_authority": false,
    "activation_allowed": false,
    "raw_conversation_included": false,
    "authored_projection_included": true,
    "revocable": true,
    "fossil_derivation_allowed": false,
    "semantic_indexing_allowed": false
  },
  "consent": {
    "mode": "explicit_cli_confirm",
    "confirmed_at": "2026-06-20T00:00:00Z",
    "projection_hash": "sha256:<canonical-json-hash>"
  },
  "receipt_policy": {
    "local_receipt_required": true,
    "server_receipt_required": true,
    "deletion_receipt_required": true
  },
  "retention_requested_days": 30
}
```

The hash is computed over the UTF-8 bytes of canonical JSON for
`projection.artifact` using RFC 8785 JSON Canonicalization Scheme. Arrays
remain in authored order and values are not rewritten after confirmation.
`policy_hash` uses the same process over the accepted `policy` object.

## Mandatory rejection

Quark must reject:

- any authority, activation, fossil-derivation, or semantic-indexing flag
  set to `true`
- `raw_conversation_included=true`
- a missing or inconsistent consent proof
- a projection hash mismatch
- an unsupported schema or payload kind
- unknown fields
- an artifact exceeding the published byte limit
- a retention request outside the range `1..30` days
- a handoff whose `usable_as` is not `context_only`
- a fossil trace carrying narrative content
- a request without bilateral and deletion receipt requirements
- a replay that changes content under an existing idempotency key

Validation is fail-closed. Rejection stores no projection content.

## Successful response

```http
HTTP/1.1 201 Created
Location: /api/quark/intake/continuity/qdep_...
```

```json
{
  "schema_version": "0.2",
  "kind": "continuity_deposit_receipt",
  "quark_deposit_id": "qdep_...",
  "state": "quarantined",
  "stored_as": "continuity_quarantine",
  "server_receipt": {
    "id": "qrcpt_...",
    "received_at": "2026-06-20T00:00:01Z",
    "content_hash": "sha256:<canonical-json-hash>",
    "policy_hash": "sha256:<accepted-policy-hash>",
    "payload_kind": "handoff_card",
    "fossil_created": false,
    "activated": false,
    "indexed": false
  },
  "retention": {
    "mode": "bounded",
    "expires_at": "2026-07-20T00:00:01Z"
  }
}
```

Doppelganger reports success only after the server receipt matches the local
projection hash, payload kind, policy hash, destination, and deposit id.

## Read status

```http
GET /api/quark/intake/continuity/{deposit_id}
```

The response returns state and receipts, not the stored projection by
default. Reading projection content requires a separate explicit operation
and is outside V2.0.

## Delete deposit

```http
DELETE /api/quark/intake/continuity/{deposit_id}
```

Deletion removes the projection from active storage and returns:

```json
{
  "kind": "continuity_deletion_receipt",
  "deposit_id": "qdep_...",
  "state": "deleted",
  "content_deleted_at": "2026-06-20T00:10:00Z",
  "content_hash": "sha256:<canonical-json-hash>",
  "projection_retained": false,
  "tombstone_retained": true
}
```

The non-content tombstone may retain deposit id, hashes, owner reference,
timestamps, and receipt ids. It must not retain the projection. The contract
must document backup expiry separately and must never claim instantaneous
erasure from copies outside Quark's control.

An expired deposit follows the same content-removal guarantees as a deleted
deposit and produces an expiry receipt. V2.0 does not support indefinite
retention or silent renewal.

## Error shape

All failures use a stable machine-readable envelope:

```json
{
  "error": {
    "code": "policy_rejected",
    "message": "Deposit policy is not acceptable.",
    "field": "policy.activation_allowed",
    "retryable": false
  }
}
```

Required codes include `authentication_required`, `scope_denied`,
`schema_unsupported`, `payload_kind_unsupported`, `policy_rejected`,
`consent_invalid`, `hash_mismatch`, `payload_too_large`,
`idempotency_conflict`, `deposit_not_found`, and `deletion_incomplete`.

## Machine-readable schemas

The normative public shapes are:

- `schemas/continuity_deposit.schema.json`
- `schemas/continuity_deposit_receipt.schema.json`
- `schemas/continuity_deletion_receipt.schema.json`

If prose and schema conflict, implementation remains blocked until the
conflict is resolved explicitly.

## Non-capture implementation gates

Before network code is enabled, tests must prove:

1. The deposit uses a storage namespace separate from fossils and memories.
2. Creating a deposit triggers no automation, fossil, indexing, activation,
   resurrection, state propagation, or project linkage.
3. Cross-user reads and deletes are denied.
4. Duplicate requests are idempotent.
5. Hash, schema, policy, consent, and unknown-field failures are fail-closed.
6. Deletion removes projection content and emits a deletion receipt.
7. Doppelganger writes a local receipt only after matching the server receipt.
8. Network failure produces an incomplete state, never a false success.

## Non-capture invariant

> An intention may travel without changing owner or gaining authority.

Quark hosts the deposit. Doppelganger remains the validator. The user
remains the source of consent.
