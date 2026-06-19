# Threat Model

This document exists so the boundary is explicit, not assumed.

## What Doppelganger does not do, ever

- **It does not collect AI account credentials.** No login flow for
  ChatGPT, Claude, Gemini, or any other assistant exists in this codebase.
- **It does not connect AI accounts.** There is no OAuth, no session
  cookie capture, no API-key vaulting for third-party assistants.
- **It does not read cached conversations.** Nothing in `packages/core` or
  `packages/cli` scans browser storage, clipboard history, or chat logs.
- **It does not sync in the background.** There is no daemon, no scheduled
  job, no watcher process. Every command in `packages/cli/index.ts` runs
  once, does its work, and exits.
- **It does not upload by default.** `doppel quark dry-run` never makes a
  network call (see `packages/core/policy.ts::buildContinuityEnvelope` and
  the dry-run implementation in `packages/cli/index.ts`) — and a real
  `doppel quark deposit` is not implemented at all in V1 (see
  `docs/quark-integration.md`).
- **It does not create an autonomous double.** There is no loop, no
  scheduler, no agent runtime anywhere in this repository.
- **It does not perform automatic emotional analysis.** Cards are written
  by the user, in the user's words, on the user's command. Nothing
  classifies tone or affect.
- **It does not create a fossil without a user action.** `fossil_trace`
  cards are created the same way every other card is: `doppel card add`.

## What an attacker, or a careless future contributor, might try

| Risk | Mitigation in this repo |
|---|---|
| Add a background sync "for convenience" | No process manager, scheduler, or daemon exists to attach one to. Any addition of this kind is a doctrine violation (invariant #2, `docs/doctrine.md`) before it is a code review comment. |
| Let `authority` default to `true` somewhere | `policy.ts::assertCardInvariants`/`assertHandoffInvariants`/`assertContinuityEnvelope` reject `authority === true` on every card, handoff, and deposit envelope — checked again at the `vault.ts` write boundary, not just where the object is first constructed, so a card built any other way still gets caught. A default flip fails loudly, not silently. |
| Edit a vault JSON file after it was safely written | Runtime validators reject malformed JSON, unknown fields, invalid shapes, and policy violations every time an object is read. Rendering never launders a tampered `authority: true` into a displayed `authority: false`. |
| Smuggle raw user text into a `fossil_only` export | `scopes.ts::projectCardForScope` strips `content` from every card under the `fossil_only` scope, regardless of what the card's own `sensitivity` claims. |
| Create a `fossil_trace` carrying narrative content (re-creating "user memory" inside the fossil store) | `policy.ts::assertCardInvariants` rejects `content` on `fossil_trace`, and caps its `label` at 60 characters — a fossil label must name a structural pattern, never restate a preference in prose, and a long narrative sentence can no longer be smuggled through the `label` field instead of `content`. Checked at creation (`cards.ts::createCard`) and again at the `vault.ts` write boundary. |
| Let a sensitive card leak into `--scope deep` without the user opting it in | `scopes.ts::isCardAllowedInScope`'s `deep` case requires `deep_allowed === true`, OR (kind is `project_card`/`boundary_card` AND `sensitivity !== "sensitive"`) — a `sensitivity: sensitive` card only reaches `deep` if explicitly marked `deep_allowed`, matching the scope's own "never the default" description. |
| Auto-confirm a Quark deposit | `doppel quark deposit` is hard-coded to print a refusal and exit 1 (see `packages/cli/index.ts::cmdQuarkDeposit`) until the Quark-side intake endpoints exist. There is no `--confirm` path to bypass. |
| Browser extension silently injecting context | Not built. When it is built, `docs/browser-extension-policy.md` is the contract it must follow — manual actions only, no background page access. |
| Leak the vault path or contents over MCP | `packages/adapters/mcp/` is an empty placeholder. No MCP server exists yet to leak through. |
| Skip the audit trail with an export flag | Context and handoff exports always append a trust receipt. The former `--no-receipt` escape hatch no longer exists. |
| Treat `revocable: true` as remote recall | Revocation is explicitly local: it removes the vault artifact and records the act, but never claims to erase copies already exported elsewhere. |
| Let a target template silently widen the export | Target profiles are generated after scope filtering and carry receiving guidance only. They cannot add cards, remove boundaries, or alter policy flags. Markdown and JSON expose the same profile metadata. |

## What is genuinely deferred (not silently dropped)

See `CHANGELOG.md` at the repo root for the authoritative list of what V1
ships versus what is explicitly out of scope and why.
