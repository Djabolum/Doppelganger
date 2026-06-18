# Glossary

| Term | Definition |
|---|---|
| **Identity anchor** | A local, pseudonymous id created by `doppel init` (`packages/core/identity.ts`). Never a real-world identity, never proof of access or ownership. |
| **Card** | A generic local note: `memory_card`, `boundary_card`, `project_card`, or `fossil_trace` (`packages/core/cards.ts`). Always carries `authority: false` and `revocable: true`. |
| **Memory card** | A stated preference or fact, e.g. "the user prefers layered responses." Not verified, not truth. |
| **Boundary card** | A stated limit on how an assistant should behave toward the user, e.g. "do not diagnose me." |
| **Project card** | A fact about a specific project: name, objective, active decisions. |
| **Fossil trace** | A structured behavioral signal, never raw conversation text. The only card kind allowed under the `fossil_only` scope. |
| **Handoff card** | A richer, separate object (`packages/core/handoff.ts`) carrying decisions, open questions, and boundaries from one conversation, meant to be picked up — never obeyed — by another assistant. |
| **Context pack** | The readable export built from cards for a given scope and target (`packages/core/context_pack.ts`). Not identity. |
| **Trust receipt** | A record of one past export: target, scope, cards exported, whether raw text was included (`packages/core/receipts.ts`). Does not authorize future exports. |
| **Scope** | One of `minimal`, `project`, `handoff`, `deep`, `fossil_only` — decides which cards may appear in a context pack (`packages/core/scopes.ts`, `docs/scopes.md`). |
| **Continuity envelope** | The fixed set of authority flags (`authority`, `memory_authority`, `decision_authority`, `activation_allowed`, `raw_text_included`, `revocable`, `source`) attached to anything that would leave the vault toward an external host (`packages/core/policy.ts`). |
| **Vault** | The local `.doppelganger/` directory holding the manifest, cards, handoffs, receipts, and config (`packages/core/vault.ts`). V0 is plain files; encryption is a later milestone. |
| **Quark host** | An external system (Quark-AI, or any future host) that may receive a deposit. Receiving a deposit does not make it the owner of that context. |
| **Dry run** | A preview of what a deposit would contain, computed and printed entirely locally, with no network call (`doppel quark dry-run`). |

## Objects that must never be confused

See `docs/doctrine.md` for the four-object table (Memory Card, Fossil
Trace, Handoff Card, Trust Receipt) and why they are stored separately.
