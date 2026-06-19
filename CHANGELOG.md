# Changelog

## 2026-06-19 — V1.1 Field hardening

- added `doppel doctor`: vault presence/integrity, private permissions,
  artifact counts, receipt ledger, network-disabled state, Quark adapter
  state, and an executable policy chokepoint self-test
- added explicit `--format markdown|json` to context and handoff exports
- added bounded receiving profiles for ChatGPT, Claude, Gemini, and generic
  assistants; profiles alter presentation only, never scope or policy
- bumped `context_pack` to schema `0.2` because `target_profile` is now
  carried in both Markdown and JSON exports
- added `doppel receipt show --id ...` for human-readable export history
- private `0600` permissions now also apply to explicit file exports
- documented eight field cases, the V1.1→V3 roadmap, and the strict draft
  Quark Intake Contract for V2
- confirmed that the currently available Quark interfaces do not implement
  the required continuity contract; no network adapter was fabricated
- added a public-documentation policy and automated exposure scan; private
  deployment paths, domains, topology names, ports, and operator details are
  rejected from public docs and examples

## 2026-06-19 — Integrity, scope, consent, and test hardening

Closed the nine findings from the full architecture-aware repository audit:

1. Vault files are now treated as untrusted input. Runtime validators mirror
   the JSON schemas, reject unknown fields, name malformed files, and rerun
   policy checks on every loaded card and handoff.
2. `fossil_only` context packs now expose their selected fossils in a
   dedicated `Fossil Traces` section instead of silently dropping them.
3. `context build --scope handoff` now refuses with a pointer to
   `handoff export --id`, instead of producing a misleading empty pack.
4. Context and handoff exports always write trust receipts. The
   `--no-receipt` bypass was removed; handoff ids are tracked separately from
   generic card ids.
5. Local revocation is now executable through `card revoke` and
   `handoff revoke`, with an append-only `revocations.jsonl` audit trail.
6. Vault directories and files are created/hardened as `0700` and `0600`.
7. Each CLI command rejects unknown flags, so typos no longer silently
   downgrade sensitivity or alter behavior.
8. `quark dry-run` prints the exact artifact plus continuity envelope that
   would be sent, while remaining fully local and network-free.
9. Added a Node test suite covering tampering, corruption, scope behavior,
   receipts, revocation, permissions, CLI parsing, and dry-run disclosure.
   Added the missing handoff JSON schema and aligned examples/docs.

## 2026-06-19 — Pre-merge audit: policy chokepoint, scope leak, CLI parsing

Full code review pass (10 angles, verified live against the actual CLI, not
just read) before merging the i18n/translation cleanup to `main`. Five
confirmed bugs, all fixed and re-verified:

1. **`assertCardInvariants` / `assertContinuityEnvelope` were dead code.**
   `policy.ts`'s own header claimed "every other module must pass through
   here before anything is persisted" — false: `vault.ts::saveCard` and
   `saveHandoff` wrote any object handed to them with zero validation.
   Fixed: `assertCardInvariants` now runs inside `createCard` AND again in
   `vault.ts::saveCard` (so a card built any other way is checked too);
   added `assertHandoffInvariants` and wired it into `saveHandoff`; wired
   `assertContinuityEnvelope` into `quark dry-run` right after the envelope
   is built.
2. **The fossil/content guard only checked `--content`, never `--label`.**
   `doppel card add fossil --label "<full narrative sentence>"` succeeded —
   the exact memory/fossil blend invariant #3/#9 exist to prevent, just
   smuggled through the one field the guard didn't cover. Fixed: moved the
   check into `policy.ts::assertCardInvariants` (the real chokepoint, see
   #1) and added a `label` length cap (60 chars) for `fossil_trace` — a
   pattern name, not a sentence. `schemas/card.schema.json` now encodes the
   same rule with an `if/then`.
3. **`--scope deep` leaked sensitive cards that were never opted in.**
   `isCardAllowedInScope`'s `deep` case allowed any `project_card`/
   `boundary_card` unconditionally, with no `sensitivity` filter and no
   `deep_allowed` check — contradicting the scope's own description
   ("plus cards explicitly marked deep_allowed. Never the default").
   Verified live: a `boundary_card` marked `sensitivity: sensitive` was
   excluded from `--scope project` (correct) but appeared in full in
   `--scope deep` despite never being marked `deep_allowed`. Fixed:
   `deep` now requires either `deep_allowed === true`, or
   (`project_card`/`boundary_card` AND not `sensitivity: sensitive`) —
   matching the description it always claimed to follow.
4. **A `--flag` value starting with `--` was silently dropped.**
   `doppel card add memory --content "--my private note"` stored
   `"content": "true"` on disk — no error, exit 0. The parser's heuristic
   ("does the next token look like a flag?") guessed wrong and fell back to
   treating the current flag as boolean. Fixed: `parseArgs` now has an
   explicit allowlist of boolean-only flags (`deep-allowed`, `no-receipt`,
   `confirm`); every other flag always consumes the next token as its
   value, and throws `--<flag> expects a value` if none exists, instead of
   silently substituting `"true"`.
5. **Clipboard failure was silently swallowed.** `doppel handoff export`
   (no `--out`) printed nothing when `copyToClipboard` failed — a user on a
   headless box would assume the copy succeeded. Fixed: the failure
   `reason` (e.g. "No clipboard tool found... use --out instead") is now
   printed to stderr.

Re-verified after fixing: the full README Quickstart still diffs clean
against `examples/minimal/context_pack.md`; all five fixes were reproduced
live (bug present) and re-tested live (bug gone, no regression on the
legitimate use cases — e.g. short fossil labels, `--deep-allowed` opt-in,
`--no-receipt`) before this entry was written.

Lower-severity design debt found in the same pass and deliberately **not**
blocking this merge — tracked instead: card/handoff/receipt IDs use 48 bits
of randomness with no collision check before a file write (silent overwrite
on collision); `vault.ts`'s `JSON.parse` calls have no try/catch around a
possibly-corrupted file; `findCard`/`findHandoff` always scan every kind
instead of using an already-known kind (O(N) instead of O(1) for
`quark dry-run`); the vault root is implicit (`process.cwd()/.doppelganger`)
with no override or cross-invocation check; ID generation, timestamp
generation, and JSON read/write are each hand-repeated 4-6 times instead of
through one shared helper; several exports (`SCOPE_DEFINITIONS`,
`POLICY_INVARIANTS`, `touchCard`, `Vault.deleteCard`, `filterHandoffsForScope`,
`exportJson`) have no caller anywhere in the codebase.

## 2026-06-18 — V1 MVP

First real implementation, on top of a repo that previously had only a
`README.md` and an empty scaffold (`docs/`, `schemas/`, `packages/`,
`examples/` all zero-byte placeholders, plus one filename bug).

### Fixed before building

- `schemas/card.schema.jsoncard.schema.json` → renamed to
  `schemas/card.schema.json` (duplicated extension typo).
- `packages/core/adapters/file-export/` → moved to `packages/adapters/file-export/`
  (adapters belong beside `core`, not nested under it).
- `packages/core/cli/index.ts` → moved to `packages/cli/index.ts` (the CLI is
  its own package, not part of core).

### Shipped

- **`packages/core`** — `identity.ts`, `vault.ts`, `cards.ts`, `scopes.ts`,
  `context_pack.ts`, `handoff.ts`, `receipts.ts`, `policy.ts`. Zero runtime
  dependencies — only Node's `fs`/`path`/`crypto`/`child_process`.
  `policy.ts` actively asserts `authority: false` / `revocable: true` on
  every card, export, and deposit envelope; it does not just document the
  invariant.
- **`packages/cli`** — the `doppel` binary: `init`, `card add`, `card list`,
  `context build`, `handoff create`, `handoff list`, `handoff export`,
  `receipt list`, `quark dry-run`, `status`, `inspect`. `quark deposit`
  exists as a command name and refuses to run (exit 1, points to
  `docs/quark-integration.md`) — see "Deferred" below.
- **`packages/adapters/file-export`** — markdown/JSON export to a chosen
  path, best-effort clipboard copy (`pbcopy`/`wl-copy`/`xclip`/`clip`,
  fails soft if none is found).
- **`schemas/`** — the four V0 schemas: `manifest`, `card`, `context_pack`,
  `trust_receipt` (JSON Schema 2020-12).
- **`examples/`** — `minimal/` (manifest + two cards + the exact context
  pack they produce), `project_handoff/` (handoff card + its markdown
  export), `quark_deposit/` (a fossil_trace card + the dry-run preview it
  produces). All three were generated from the real CLI output, then
  checked back into the repo as fixtures — not hand-typed guesses.
- **`docs/`** — `doctrine.md` (the 10 invariants + the "objects that must
  never be confused" table), `threat-model.md`, `scopes.md`,
  `quark-integration.md`, `browser-extension-policy.md`, `glossary.md`.
- **`README.md`** — added a Quickstart and a Status section; kept the
  original positioning text as-is.
- **`package.json` / `tsconfig.json`** — did not exist before. TypeScript
  5.5 + `@types/node` as the only devDependencies; compiles clean
  (`npx tsc -p tsconfig.json`, zero errors).

### Verified, not just written

Ran the full command set end-to-end in a scratch vault (`/tmp/doppel-smoke`,
deleted after): `init` → `card add` (memory + boundary + fossil) →
`context build --scope minimal` (output byte-for-byte matches
`examples/minimal/context_pack.md`) → `handoff create` / `handoff export` →
`quark dry-run` (fossil and handoff) → `quark deposit --confirm` (refuses,
exit 1) → `inspect` / `status` / `receipt list`. Two real bugs were found
and fixed during this pass, not left in:

1. `quark dry-run --type fossil` printed `kind: fossil_card` instead of the
   real card kind `fossil_trace` (string concatenation bug in
   `cmdQuarkDryRun`). Fixed, and a `--type`/actual-card-kind mismatch check
   was added so a wrong `--type` now fails loudly instead of silently
   reporting the wrong kind.
2. Any thrown error (e.g. running a command against an uninitialized vault)
   printed a raw Node stack trace instead of a clean `doppel: ...` message.
   `main()` is now wrapped in try/catch.

### Hardened after review — memory_card vs fossil_trace

Flagged in review: nothing stopped `doppel card add fossil --content "..."`
from attaching free narrative text to a `fossil_trace`, which would quietly
re-create "user memory" inside the fossil store under a different kind —
exactly what invariants #3 and #9 (`docs/doctrine.md`) exist to prevent.

Fixed at the source, not filtered later: `packages/core/cards.ts::createCard`
now throws if `content` is passed for `fossil_trace`. A fossil's `label`
must name a structural pattern; it cannot restate a preference in prose.
`docs/doctrine.md` gained a dedicated section on this (it was previously
only implied by the four-object table), and `docs/threat-model.md` gained a
matching row. Verified: `doppel card add fossil --label "x" --content "..."`
now exits 1 with a clear message; the same command without `--content`
still succeeds.

### Deferred — explicitly, not silently

Per the original MVP scope, these are tracked, not forgotten:

- **`packages/browser-extension/`** — empty, with a `README.md` explaining
  why (V1.1, must follow `docs/browser-extension-policy.md`).
- **`packages/adapters/mcp/`** — empty, with a `README.md` explaining why
  (must come after the CLI's scope filtering has real usage behind it).
- **`packages/adapters/quark/`** — no HTTP client. `README.md` explains
  that the Quark-AI backend does not yet expose the
  `POST /api/quark/intake/*` endpoints a real deposit would need; building
  those is a separate effort on the Quark-AI side, documented in
  `docs/quark-integration.md`.
- **`schemas/handoff_card.schema.json`, `fossil_trace.schema.json`,
  `quark_deposit.schema.json`** — not written. The original design
  explicitly scoped V0 to the four schemas that exist; these three were
  named as "next", once the Quark-side shapes stop being speculative.
- **Encrypted vault** — V0 is plain JSON/JSONL files under `.doppelganger/`,
  as the original design specified ("V0 local file storage, V1 encrypted
  vault — don't block on perfect encryption").
- **Cross-AI observatory (V5 in the source design)** — not started. Needs
  the handoff/context-pack rail to have real multi-assistant usage first.
