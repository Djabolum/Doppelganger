# Contributing

Thanks for considering a contribution. Before opening a PR, please read
`docs/doctrine.md` and `docs/threat-model.md` — they are not background
reading, they are the spec.

This is a public repository. Documentation changes must also follow
`docs/publication-policy.md`; do not include private paths, domains, service
topology, deployment commands, or incident data.

## The short version

Doppelganger exists specifically to *not* be a background agent, a
credential harvester, or an authoritative memory. Contributions are
reviewed against that as a hard constraint, before code quality, style, or
test coverage are even discussed.

## Contributions that will be rejected

Regardless of code quality, the following will not be merged:

- **Silent scraping** of any kind — reading browser storage, conversation
  caches, clipboard history, or any other AI surface without an explicit,
  visible user action tied to that specific read.
- **Automatic upload** of vault content anywhere, by default or behind a
  flag that defaults to on. Every export and every deposit must be a
  result of an explicit command the user typed or clicked.
- **Authoritative memory** — any change that lets a card, context pack,
  handoff, or receipt carry `authority: true`, decide something on the
  user's behalf, or override a guardrail. `packages/core/policy.ts` exists
  to make this structurally impossible; do not work around it.
- **Hidden agentivity** — a daemon, scheduler, watcher, or any loop that
  runs without being invoked by a specific user command. Doppelganger has
  no concept of "running in the background."
- **Blending memory and fossil objects.** A `memory_card` carries readable
  meaning. A `fossil_trace` carries a structural signal and must never
  carry narrative content (`packages/core/cards.ts::createCard` enforces
  this — see `docs/doctrine.md`, "Memory and fossil are not a gradient").
  Don't add a way around that check.
- **AI account credential collection** of any kind — see `SECURITY.md`.

If a PR does one of these things even partially, expect it to be closed
with a pointer to this file, not negotiated line by line.

## What's welcome

- Bug fixes, including in the policy/scope enforcement itself (with a
  test or a reproduction showing the bug).
- New card kinds, scopes, or export adapters that respect the existing
  invariants — i.e. they pass through `packages/core/policy.ts`, not
  around it.
- Documentation improvements, especially examples.
- The deferred packages (`packages/browser-extension`,
  `packages/adapters/mcp`, a real `packages/adapters/quark`) — but read
  the relevant `README.md` and policy doc first (`docs/browser-extension-policy.md`,
  `docs/quark-integration.md`); these have explicit constraints, not a
  blank slate.

## Workflow

1. Open an issue first for anything beyond a small fix — especially for
   the deferred packages, so the approach can be agreed before code is
   written.
2. Keep PRs scoped to one change. A PR that mixes a doctrine-sensitive
   change with an unrelated refactor will be asked to split.
3. Before opening a PR:
   ```bash
   npm install
   npm test
   ```
   Add a regression test for policy, scope, receipt, vault, or CLI changes.
   Also describe any manual verification that a test cannot express.
4. New invariants or scopes should come with a `docs/` update in the same
   PR — not as a follow-up.

## Code of conduct

Be direct, be specific, assume good faith. Disagreements about whether
something violates the doctrine above are welcome — just have the
discussion in the PR or issue before writing the code, not after.
