# Security Policy

Doppelganger is local-first by design: V1 has no server component, no
account system of its own, and no default network calls. This document
exists anyway, because the project handles user context, memory cards, and
handoffs between AI assistants — and because that stays true as the project
grows.

## Supported versions

| Version | Supported |
|---|---|
| `0.1.x` (V1 MVP) | Yes — current development line |

There is no stable release yet. Until a `1.0.0` tag exists, security fixes
land on the active development branch.

## Reporting a vulnerability

Please report security issues privately rather than opening a public
GitHub issue. Open a private security advisory on this repository
(GitHub → Security → "Report a vulnerability"), or contact the maintainer
directly through the contact information on the maintainer's GitHub
profile (`@Djabolum`).

Please include:
- the version or commit you tested against
- the command or code path that triggers the issue
- what you expected vs. what happened
- whether the issue requires local access, or is reachable some other way

We will acknowledge reports as soon as possible and aim to ship a fix or a
mitigation before any public disclosure of details.

## Security principles

- **Authority is asserted, not assumed.** `packages/core/policy.ts` checks
  `authority === false` (and the related flags) on every card, export, and
  deposit envelope before it is persisted or sent anywhere. A change that
  makes that check pass while the object actually carries authority is a
  security bug, not a style issue.
- **Local-first means local by default, not local by promise.** There is
  no background process, no scheduler, no daemon in this codebase. Every
  command in `packages/cli` runs once and exits.
- **No silent network calls.** Every export adapter
  (`packages/adapters/file-export`) and every deposit preview
  (`doppel quark dry-run`) is inert by default — see
  `docs/threat-model.md` for the full breakdown of what is, and is not,
  built.
- **Receipts, not trust.** Every export through `doppel context build`
  writes a `trust_receipt` (`packages/core/receipts.ts`) recording exactly
  what left the vault and when — so a leak or a mistake is auditable after
  the fact, not just "trusted not to happen."

## What Doppelganger will never ask for

> Doppelganger never asks for AI account credentials.

It will also never ask for, request, or silently capture:
- a login/password or API key for ChatGPT, Claude, Gemini, or any other
  assistant
- access to your browser's cookies, session storage, or autofill data
- background access to a tab, window, or clipboard without an explicit,
  visible action tied to that specific request

If a future version (CLI, browser extension, or otherwise) appears to do
any of the above, that is a bug and a doctrine violation — see
`docs/doctrine.md` and `docs/threat-model.md`. Report it the same way you
would report any other vulnerability.

## Local-first assumptions

- The vault (`.doppelganger/`) is plain JSON/JSONL on disk in V0. It is
  not encrypted yet. Treat it like any other local file containing
  personal notes: protect it with normal filesystem and disk permissions.
  Encryption at rest is a planned V1 follow-up, not a V1 MVP claim.
- Nothing in this repository assumes a multi-user environment. The vault
  is single-user, single-machine, by design.

## Quark-AI integration status

`doppel quark dry-run` builds a deposit preview entirely locally and makes
no network call. `doppel quark deposit` is **not implemented** — it exits
1 with an explanation — because the Quark-AI backend does not yet expose
the intake endpoints a real deposit would need. There is no code path in
this repository today that sends vault content to Quark-AI, or to any
other host, over the network. See `docs/quark-integration.md` for the
full status and the planned envelope once that changes.
