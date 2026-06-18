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
| Let `authority` default to `true` somewhere | `policy.ts` asserts `authority === false` (or rejects `true`) on every card, export, and deposit envelope. A default flip would fail loudly, not silently. |
| Smuggle raw user text into a `fossil_only` export | `scopes.ts::projectCardForScope` strips `content` from every card under the `fossil_only` scope, regardless of what the card's own `sensitivity` claims. |
| Create a `fossil_trace` carrying narrative content (re-creating "user memory" inside the fossil store) | `cards.ts::createCard` throws at creation time if `content` is passed for `fossil_trace` — not filtered later, refused at the source. A fossil label must name a structural pattern, never restate a preference in prose. |
| Auto-confirm a Quark deposit | `doppel quark deposit` is hard-coded to print a refusal and exit 1 (see `packages/cli/index.ts::cmdQuarkDeposit`) until the Quark-side intake endpoints exist. There is no `--confirm` path to bypass. |
| Browser extension silently injecting context | Not built. When it is built, `docs/browser-extension-policy.md` is the contract it must follow — manual actions only, no background page access. |
| Leak the vault path or contents over MCP | `packages/adapters/mcp/` is an empty placeholder. No MCP server exists yet to leak through. |

## What is genuinely deferred (not silently dropped)

See `CHANGELOG.md` at the repo root for the authoritative list of what V1
ships versus what is explicitly out of scope and why.
