# Scopes

A scope decides what is allowed to circulate in a single export. Defined in
`packages/core/scopes.ts`. Five scopes exist; none of them is "everything".

## `minimal`

General preferences and global boundaries only.

- Included: `memory_card` and `boundary_card`, excluding anything marked
  `sensitivity: "sensitive"`.
- Excluded: project cards, fossil traces, anything sensitive.
- Use when: starting a new conversation with an assistant that should know
  how the user likes to be answered, and nothing else.

## `project`

Adds the chosen project's context.

- Included: `project_card` and `boundary_card`, excluding sensitive cards.
- Excluded: memory cards (general preferences), fossil traces.
- Use when: handing a specific project's context to an assistant.

## `handoff`

Adds the decisions and open questions of a previous conversation.

- Included: a single `HandoffCard`'s decisions, open questions, and
  boundaries (see `packages/core/handoff.ts`).
- Excluded: generic cards entirely — a handoff scope is built from
  `doppel handoff export`, not `doppel context build`.
- Use when: continuing a conversation in a different assistant.

## `deep`

Richer, but still explicit — never the default.

- Included: everything `project` includes, plus any card explicitly marked
  `deep_allowed: true` at creation time (`doppel card add ... --deep-allowed`).
- A card is never deep-allowed by accident; the flag must be set when the
  card is created.

## `fossil_only`

No readable sensitive content at all.

- Included: `fossil_trace` cards only, and even then with `content`
  stripped at export time (`scopes.ts::projectCardForScope`) regardless of
  what the card itself carries.
- Use when: the target is Quark-AI, or any other host that should receive
  structured signals, never prose.

## Choosing a scope

| Question | Scope |
|---|---|
| "What's my general style?" | `minimal` |
| "What are we building?" | `project` |
| "Pick up where the other AI left off" | `handoff` |
| "I explicitly want this assistant to know more" | `deep` |
| "This is going to Quark, not to a conversation" | `fossil_only` |

There is no scope called "everything", on purpose.
