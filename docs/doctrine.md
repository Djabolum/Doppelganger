# Doctrine

Doppelganger is a context silhouette the user controls, not a clone, not an
agent, not a memory. These ten invariants are not aspirational — every
object that crosses `packages/core/policy.ts` is checked against them
before it is persisted or exported.

1. **Doppelganger != user** — it carries context the user chose to expose,
   never the user's identity, voice, or authority.
2. **Doppelganger != autonomous agent** — every card, export, and deposit is
   the result of an explicit user action. Nothing runs on its own.
3. **Doppelganger != full memory** — it holds what the user wrote down, not
   everything that happened.
4. **Context pack != identity** — a pack is a bounded, scoped excerpt, never
   a stand-in for the person.
5. **Memory card != truth** — a memory card records a stated preference or
   fact, not a verified one.
6. **Handoff card != command** — it describes what may be picked up as
   non-authoritative context, never an instruction to continue identically.
7. **Receipt != permanent consent** — a trust receipt records one past
   export; it authorizes nothing going forward.
8. **Quark host != owner** — depositing a trace into Quark-AI (or any other
   host) does not transfer ownership or authority over it to that host.
9. **Fossil trace != raw conversation** — a fossil trace is a structured
   signal, never the user's actual words.
10. **AI-to-AI continuity != AI-to-AI autonomy** — handoffs help a human
    carry context between assistants; they do not let assistants talk to
    each other unsupervised.

## Memory and fossil are not a gradient — they are two different objects

This is the single biggest conceptual risk in this design, so it gets its
own heading instead of staying buried in a table.

- A **memory_card** holds readable meaning: *"The user prefers structured
  replies."*
- A **fossil_trace** holds a structural signal about recurrence: *"This
  theme recurs with stability across several contexts."*

These must never fuse into one object. If they do, Quark-AI (or any other
host receiving fossils) quietly becomes "user memory" again under a
different name — exactly the thing invariant #3 (`Doppelganger != full
memory`) and invariant #9 (`Fossil trace != raw conversation`) exist to
prevent. This is not just a naming convention: `packages/core/cards.ts::createCard`
throws if a caller tries to attach `content` (free narrative text) to a
`fossil_trace` card. A fossil's `label` must name a pattern, not restate a
preference in prose.

## Objects that must never be confused

| Object | Says |
|---|---|
| Memory Card | "The user prefers layered responses." |
| Fossil Trace | "Across several interactions, the 'layered responses' pattern recurs with high stability." |
| Handoff Card | "In the previous conversation, we decided to structure the module in V0–V5." |
| Trust Receipt | "On 2026-06-18, the `project` scope was exported to Claude." |

Each of these four objects is a different kind of fact, with a different
shelf life and a different authority (always `false`). They are stored
separately (`packages/core/cards.ts`, `handoff.ts`, `receipts.ts`) and must
never be merged into one generic blob.

## Authority is structural, not decorative

Every persisted object in this project carries `authority: false` (or, for
deposits, the fuller `continuity_envelope` in `policy.ts`) as a required
field, validated at write time — not as a comment, not as a convention, but
as a value `packages/core/policy.ts` actively asserts before any save or
export completes. If a future change makes that assertion pass while the
object actually carries authority, that is the bug to fix first, before
anything else.
