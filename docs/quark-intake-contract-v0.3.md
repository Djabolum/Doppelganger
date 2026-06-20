# Quark Gîte Intake Contract — Candidate 0.3

Status: **specification candidate; implementation is not authorized yet**.

This contract defines Quark as a receiving host for bounded continuity.
Receiving does not grant ownership, memory authority, activation authority,
or permission to derive a fossil.

## Positive capability boundary

In V2.0, Quark is authorized to perform only these operations on a
continuity deposit:

1. Validate schema, policy, consent, hashes, payload kind, byte limits,
   retention, credential scope, and idempotency.
2. Store an accepted projection in the dedicated
   `continuity_quarantine` namespace.
3. Return a server receipt for the accepted deposit.
4. Return deposit state, hashes, retention metadata, and receipts without
   returning projection content.
5. Delete or expire the stored projection.
6. Retain a non-content tombstone containing only deposit id, hashes,
   timestamps, owner reference, and receipt ids.
7. Retain encrypted disaster-recovery backup copies only under the backup
   retention boundary below. Backup copies are unavailable to application
   reads and cannot be used for indexing, analytics, training, promotion,
   fossilization, or restoration into active storage except disaster
   recovery.

Any operation not explicitly listed above is forbidden in V2.0.

## No implicit capability

The contract is deny-by-default:

> A host receives only the capabilities explicitly granted by the contract.
> No implicit capability exists.

> A deposit grants quarantine only. Any later read, promotion, indexing,
> fossil derivation, or memory operation requires a new contract, a new
> consent event, and a new receipt.

V2.0 consent cannot be reused for projection reads, promotion,
fossilization, indexing, automation, activation, project linkage, memory,
model training, analytics, profiling, or any other purpose.

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

## Continuity-scoped credential lifecycle

A continuity credential is created only through an explicit user action. It
must not be a general account token, service token, administrator token, or
private infrastructure credential.

Required properties:

- allowed scopes:
  - `continuity:intake:create`
  - `continuity:intake:read_status`
  - `continuity:intake:delete`
- default TTL: 24 hours
- maximum TTL: 7 days
- bound to one user account
- optionally bound to a user-visible device label
- immediately revocable by the user
- rotatable without changing local vault contents or deposit ownership
- absent from committed files, examples, schemas, receipts, context packs,
  logs, and command output

Doppelganger stores the credential in the operating-system credential store
when available. The documented fallback is
`.doppelganger/credentials/quark.json`, with private file permissions and no
credential value printed by `status`, `doctor`, receipts, or errors. The
entire `.doppelganger/` directory is excluded from version control.

On suspected compromise, the user revokes the credential immediately.
Revocation blocks every subsequent request made with that credential,
including create, status, and delete. It does not silently delete existing
deposits. The user may explicitly issue a replacement scoped credential to
inspect status or request deletion.

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
  "schema_version": "0.3",
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
    "content_hash": "sha256:<canonical-json-hash>",
    "artifact_size_bytes": 408
  },
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
  },
  "consent": {
    "mode": "explicit_cli_confirm",
    "confirmed_at": "2026-06-20T00:00:00Z",
    "projection_hash": "sha256:<canonical-json-hash>"
  },
  "receipt_policy": {
    "local_receipt_required": true,
    "server_receipt_required": true,
    "deletion_receipt_required": true,
    "expiry_receipt_required": true
  },
  "retention_requested_days": 30
}
```

The hash is computed over the UTF-8 bytes of canonical JSON for
`projection.artifact` using RFC 8785 JSON Canonicalization Scheme. Arrays
remain in authored order and values are not rewritten after confirmation.
`policy_hash` uses the same process over the accepted `policy` object.

`artifact_size_bytes` is the byte length of that same canonical UTF-8
representation. V2.0 accepts at most **16 KiB (16,384 bytes)** per projection
artifact. The receiver must recompute the size and reject a mismatched
declaration or an oversized artifact before persistence.

`user_approved_projection_included` means the deposit contains a bounded
projection explicitly approved by the user. It does not mean raw
conversation content, memory authority, or permission to read the projection
later.

## Mandatory rejection

Quark must reject:

- any authority, activation, fossil-derivation, or semantic-indexing flag
  set to `true`
- `raw_conversation_included=true`
- a missing or inconsistent consent proof
- a projection hash mismatch
- an unsupported schema or payload kind
- unknown fields
- a declared artifact size that does not match the canonical UTF-8 bytes
- an artifact exceeding 16 KiB (16,384 bytes)
- a retention request outside the range `1..30` days
- a handoff whose `usable_as` is not `context_only`
- a fossil trace carrying narrative content
- a request without bilateral, deletion, and expiry receipt requirements
- a replay that changes content under an existing idempotency key

Validation is fail-closed. Rejection stores no projection content.

## Successful response

```http
HTTP/1.1 201 Created
Location: /api/quark/intake/continuity/qdep_...
```

```json
{
  "schema_version": "0.3",
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

The response returns only deposit id, state, hashes, retention metadata, and
receipts. It must not return the stored projection.

## Projection read prohibition in V2.0

V2.0 does not authorize projection content reads.

`GET /api/quark/intake/continuity/{deposit_id}` is a status operation only.
Any endpoint or parameter attempting to read projection content must return
HTTP `405` with error code `projection_read_not_supported`.

A future version may introduce projection reads only through a new explicit
contract, a separate user consent event, a separate receipt, and a new
capability scope. **V2.0 consent must not be reused as read consent.**

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
  "tombstone_retained": true,
  "backup_projection_max_retention_days": 30,
  "backup_projection_expires_no_later_than": "2026-07-20T00:10:00Z"
}
```

The non-content tombstone may retain deposit id, hashes, owner reference,
timestamps, and receipt ids. It must not retain the projection. The contract
must document backup expiry separately and must never claim instantaneous
erasure from copies outside Quark's control.

## Backup retention boundary

Production implementation is blocked until its backup expiry mechanism is
tested and published.

For V2.0, backup copies containing projection content must expire no later
than 30 days after deletion or deposit expiry. A deletion or expiry receipt
must include:

- `content_deleted_at` or `content_expired_at`
- `projection_retained: false`
- `tombstone_retained: true`
- `backup_projection_max_retention_days: 30`
- `backup_projection_expires_no_later_than`

Quark must not claim complete erasure before that deadline has passed.
`projection_retained: false` means no projection remains in active or
quarantine storage; backup residuals are disclosed separately by the two
backup fields.

Backup encryption keys must not be accessible to application request
handlers. Backup decryption is restricted to the separately controlled
disaster-recovery process and must not create an application-level projection
read capability.

An expired deposit follows the same active-content removal guarantees as a
deleted deposit and produces a `continuity_expiry_receipt`. V2.0 does not
support indefinite retention or silent renewal.

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
`idempotency_conflict`, `deposit_not_found`, `projection_read_not_supported`,
`credential_expired`, `credential_revoked`, and `deletion_incomplete`.

## Machine-readable schemas

The normative public shapes are:

- `schemas/continuity_deposit.schema.json`
- `schemas/continuity_deposit_receipt.schema.json`
- `schemas/continuity_status.schema.json`
- `schemas/continuity_deletion_receipt.schema.json`
- `schemas/continuity_expiry_receipt.schema.json`

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
   Canonical artifact size is recomputed and limited to 16 KiB.
6. Deletion removes projection content and emits a deletion receipt.
7. Expiry removes projection content and emits an expiry receipt.
8. Status responses cannot contain projection content.
9. Credential TTL, scope, revocation, rotation, and secret storage are
   enforced.
10. Backup projection content expires within 30 days after deletion or
    expiry, and backup encryption keys are inaccessible to request handlers.
11. Doppelganger writes a local receipt only after matching the server
    receipt.
12. Network failure produces an incomplete state, never a false success.

## Non-capture invariant

> An intention may travel without changing owner or gaining authority.

Quark hosts the deposit. Doppelganger remains the validator. The user
remains the source of consent.

> A host receives only the capabilities explicitly granted by the contract.
> No implicit capability exists.
