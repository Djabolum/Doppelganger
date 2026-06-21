# Network Activation Preconditions V0

Status: **BLOCKED — specification only**.

This document defines the bilateral conditions that must be proven before
Doppelganger or Quark may create any continuity network component.

It applies before creating:

- an HTTP client
- an HTTP endpoint or route
- a continuity credential or credential issuer
- endpoint configuration
- transport retry or queue logic
- runtime registration
- a live `deposit`, `status`, or `delete` command

Local builders, fixtures, validators, Doctors, import checks, and synthetic
receipt previews do not satisfy or bypass these conditions.

## Canonical rule

> No network component may be created from an assumption of future approval.
> Construction begins only after every Construction Gate item is proven.
> Activation begins only after every Activation Gate item is proven.

Anything not explicitly authorized by this document remains forbidden.

Approval to construct is not approval to activate. Approval to activate one
operation is not approval to add another operation.

## Required approval record

Construction requires one bilateral approval record containing:

- the approved contract version and Contract ID
- exact Doppelganger and Quark commit identifiers
- the completed Construction Gate checklist
- links or paths to every required evidence artifact
- the approved operations and payload kinds
- explicit confirmation that projection reads remain forbidden
- explicit confirmation that no implicit capability is granted
- approval date and named maintainers for both repositories

The approval record must be committed in both repositories. A chat message,
issue comment, branch name, tag, passing test count, or Contract ID alone is
not an authorization record.

## Construction Gate

Every item below must be true before creating a client, endpoint, route,
credential, or runtime configuration.

### C1 — Contract identity is frozen and healthy

Required:

- candidate schema version is exactly `0.3`
- both repositories use the same locked Contract ID
- both Contract Doctors report `status: healthy`
- both report `network_authorized: false`
- every Doctor check passes
- cross-repository drift guards pass without normalization that hides
  semantic differences

Evidence:

- producer and consumer Doctor JSON reports
- shared fixture manifest and lock
- passing drift mutation tests

### C2 — Local producer output is exact

Required:

- Doppelganger builds only `handoff_card` and `fossil_trace`
- artifact hash and canonical UTF-8 size are recalculated from the exact JSON
  value written to disk
- maximum artifact size remains 16 KiB
- the dry-run manifest states:
  - `network_authorized: false`
  - `http_client_present: false`
  - `endpoint_configured: false`
  - `credential_included: false`
  - `sent: false`
- an unhealthy Doctor blocks the builder before vault access or file output

Evidence:

- builder tests for handoff and fossil output
- corrected fossil canonicalization regression test
- deterministic candidate and manifest fixtures

### C3 — Local receiver verification is exact

Required:

- Quark validates builder files without storage
- candidate file SHA-256, Contract ID, payload kind, artifact hash, and
  artifact size are independently verified
- the strict candidate 0.3 validator accepts corrected fixtures
- a bundle produced by the pre-correction fossil builder is rejected
- receipt preview fields match the locked receipt surface
- receipt previews declare:
  - `preview_only: true`
  - `server_receipt_issued: false`
  - `synthetic_identifiers: true`
  - `synthetic_timestamps: true`
  - `storage_performed: false`
  - `network_authorized: false`
  - `transport_performed: false`

Evidence:

- candidate import-check reports
- negative mutation tests
- receipt-shape drift tests

### C4 — Non-capture storage gates pass

Required:

- continuity quarantine remains structurally separate from fossils,
  memories, projects, semantic indexes, automation, and activation
- mandatory rejection occurs before storage initialization
- status cannot return projection content
- deletion and expiry remove projection content
- terminal states retain non-content tombstone and receipt data only
- no promotion path exists from quarantine to fossil, memory, index,
  project, automation, or activation
- backup projection copies expire no later than 30 days after deletion or
  expiry
- backup encryption keys are inaccessible to application request handlers

Evidence:

- local intake lifecycle tests
- direct storage-invariant tests
- published backup retention and key-separation policy

### C5 — Credential design is approved before implementation

Required:

- credential purpose is continuity intake only
- allowed scopes are exactly:
  - `continuity:intake:create`
  - `continuity:intake:read_status`
  - `continuity:intake:delete`
- unknown scopes are rejected
- default TTL is 24 hours and maximum TTL is 7 days
- issuance requires explicit user action
- user revocation and rotation behavior are specified and tested in a
  network-free model
- credential values are forbidden from repositories, fixtures, schemas,
  receipts, context packs, command output, errors, telemetry, and logs
- local secret-storage behavior and version-control exclusions are reviewed
- compromise response is documented

Evidence:

- credential lifecycle threat review
- scope/TTL/revocation test plan
- secret-storage and redaction test plan

No credential value or issuer may be created merely to test this gate.

### C6 — API capability surface is closed

Required:

- only create, metadata-only status, and delete operations are proposed
- projection content reads return
  `405 projection_read_not_supported`
- no endpoint exists for promotion, fossilization, indexing, memory,
  automation, activation, analytics, training, or project linkage
- request and response schemas reject unknown fields
- canonical hashing, 16 KiB artifact limit, retention range, consent,
  receipt requirements, and idempotency behavior are unambiguous
- error codes are bounded and do not expose projection or credential content
- no generic storage or fossil endpoint is reused

Evidence:

- reviewed route table specification
- reviewed error model
- contract tests for every allowed and forbidden operation

### C7 — Transport behavior is bounded before client implementation

Required:

- the destination is explicit and cannot be inferred from arbitrary input
- secure transport and certificate verification cannot be disabled
- redirects cannot move continuity payloads or credentials to another host
- request timeouts and bounded retry behavior are specified
- retries are allowed only with the same idempotency key and exact request
  bytes
- no background queue, silent retry, automatic sync, or startup upload is
  authorized
- proxy and error handling cannot print payloads or credentials

Evidence:

- client threat model
- transport state machine
- retry/idempotency test plan
- negative redirect and logging tests

### C8 — Consent and user-visible behavior are exact

Required:

- local candidate confirmation is not reused as network-send consent
- every live deposit requires a new explicit send consent event
- consent shows destination, payload kind, hash, byte size, retention, and
  revocability before transmission
- cancellation performs no network call and creates no server resource
- success is reported only after a matching real server receipt is
  validated
- failure never claims that a deposit exists
- status and delete actions require separate explicit user actions

Evidence:

- CLI interaction specification
- consent receipt specification
- cancellation, timeout, mismatch, and ambiguous-failure tests

### C9 — Observability contains no content

Required:

- logs and metrics exclude projection content, credentials, authorization
  headers, consent text, and raw request bodies
- permitted operational fields are explicitly allowlisted
- receipt and error logs are bounded to non-content identifiers, hashes,
  states, timing, and stable error codes
- redaction tests cover success, rejection, timeout, retry, and exception
  paths

Evidence:

- logging field allowlist
- redaction tests
- sample content-free operational events

### C10 — Kill switch and rollback are designed

Required:

- network capability is closed by default
- construction does not register or enable runtime routes
- future activation requires a separate explicit flag and deployment step
- the client and receiver can be disabled independently
- disabling transport does not delete existing deposits silently
- users retain an explicit deletion path during a create-path shutdown
- rollback cannot fall back to a generic or fossil endpoint

Evidence:

- feature-flag specification
- rollback and incident runbook
- disabled-state tests

### C11 — Public and dependency review passes

Required:

- public documentation exposes no private topology, credentials, secrets,
  internal service identifiers, or operator-only paths
- new dependencies receive security, maintenance, and license review
- dependency audit is clean at the agreed severity threshold
- generated examples contain no user or production data

Evidence:

- public-documentation exposure scan
- dependency review record
- dependency audit output
- fixture provenance record

### C12 — Independent cold review approves construction

Required:

- one maintainer reviews Doppelganger as producer
- one maintainer reviews Quark as receiver
- reviewers verify the preceding evidence from clean checkouts
- reviewers confirm:
  - builder != transport
  - import check != deposit
  - validator != storage
  - receipt preview != server receipt
  - Contract ID != authorization token
- no unresolved high-severity finding remains

Evidence:

- bilateral cold-review record
- completed Construction Gate checklist

## Construction decision

Construction is authorized only when C1 through C12 are all recorded as
`PASS`.

Allowed first construction scope:

- one explicit Doppelganger continuity client
- one explicit Quark continuity route group
- continuity-scoped credential handling
- create, metadata-only status, and delete operations only

Still forbidden:

- runtime or production enablement
- automatic sync
- projection reads
- promotion, indexing, fossilization, memory, automation, activation,
  analytics, training, or project linkage
- reuse of any existing generic endpoint or credential

## Activation Gate

After construction, network traffic remains forbidden until all conditions
below pass against the exact implementation commits:

1. client and route tests pass with network disabled by default;
2. end-to-end tests pass in an isolated non-production environment;
3. real credential issuance, revocation, rotation, expiry, and redaction
   tests pass;
4. idempotent replay and conflicting replay tests pass;
5. receipt mismatch, timeout, redirect, partial failure, and retry tests
   fail closed;
6. status returns metadata only and projection-read attempts are refused;
7. delete and expiry receipts match stored lifecycle state;
8. no fossil, memory, index, automation, activation, analytics, training, or
   project hook is reachable;
9. logging and metrics contain no content or credential material;
10. backup expiry and key-separation controls are verified;
11. kill-switch and rollback drills pass;
12. a second bilateral approval record authorizes the exact environment,
    operations, commits, and activation window.

Only then may `network_authorized` change from `false`, and only in a new
versioned contract and receipt surface. Candidate 0.3 consent, manifests,
Contract IDs, Doctors, builders, import checks, and previous approval records
must not be reused as network authorization.

## Current result

Construction status: **BLOCKED**.

Activation status: **BLOCKED**.

Any future change from BLOCKED to PASS must happen in a separate commit and must not be bundled with implementation code.

The existing local milestones prove contract compatibility and non-capture
behavior only. They do not authorize creation or activation of network
components.
