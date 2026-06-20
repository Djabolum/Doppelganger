# Quark Intake Contract — Draft 0.1

Status: **architectural draft, not implemented**.

This document defines the smallest acceptable contract for V2. It does not
authorize Doppelganger to reuse an existing fossil or generic storage
endpoint.

## Endpoint

```http
POST /api/quark/intake/continuity
```

The route must be implemented explicitly on the Quark side. Until then,
`doppel quark deposit` continues to refuse.

## Deposit

```json
{
  "schema_version": "0.1",
  "kind": "continuity_deposit",
  "source": "doppelganger",
  "payload_kind": "handoff_card",
  "policy": {
    "authority": false,
    "memory_authority": false,
    "decision_authority": false,
    "activation_allowed": false,
    "raw_conversation_included": false,
    "card_content_included": false,
    "revocable": true
  },
  "payload": {
    "id": "hnd_...",
    "scope": "handoff",
    "content_hash": "sha256:...",
    "preview": "optional user-approved preview"
  },
  "receipt_policy": {
    "local_receipt_required": true,
    "server_receipt_required": true
  }
}
```

## Quark must reject

- any authority flag set to `true`
- `raw_conversation_included=true` under all circumstances
- `card_content_included=true` without a distinct explicit consent proof
- an unknown `payload_kind`
- a missing or unsupported `schema_version`
- a missing bilateral receipt policy
- a payload whose hash does not match its received projection
- any request that tries to map continuity directly into a decision tree,
  user profile, active memory, or automatic fossil

## Intake lifecycle

1. Validate transport/authentication.
2. Validate schema and policy.
3. Verify content hash.
4. Store in a continuity quarantine, not an active memory surface.
5. Return a server receipt.
6. Doppelganger stores a matching local receipt.
7. A fossil may be derived only through a separate, explicit user-approved
   action and must preserve the distinction `continuity_deposit != fossil`.

## Response

```json
{
  "quark_deposit_id": "qdep_...",
  "server_receipt": {
    "id": "qrcpt_...",
    "received_at": "2026-06-19T00:00:00Z",
    "content_hash": "sha256:...",
    "policy_accepted": true
  },
  "stored_as": "continuity_quarantine",
  "revocation_hint": {
    "mode": "request_required",
    "endpoint": "/api/quark/intake/continuity/qdep_.../revoke"
  },
  "fossil_trace": null
}
```

`revocation_hint` describes a request path. It must never be presented as
proof that copies already exported elsewhere can be recalled.

## Bilateral receipt invariant

The local receipt and server receipt must share:

- deposit id
- content hash
- payload kind
- accepted policy version
- destination
- timestamp pair

If the server receipt is absent or inconsistent, Doppelganger reports the
deposit as incomplete and does not claim success.

## Non-capture invariant

> An intention may travel without changing owner or gaining authority.

Receiving is not activation. Storage is not memory authority. Fossilization
is not automatic. A host is not an owner.
