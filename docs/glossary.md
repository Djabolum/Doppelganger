# Glossary

| Term | Definition |
|---|---|
| **Identity anchor** | A local, pseudonymous id created by `doppel init` (`packages/core/identity.ts`). Never a real-world identity, never proof of access or ownership. |
| **Card** | A generic local note: `memory_card`, `boundary_card`, `project_card`, or `fossil_trace` (`packages/core/cards.ts`). Always carries `authority: false` and `revocable: true`. |
| **Memory card** | A stated preference or fact, e.g. "the user prefers layered responses." Not verified, not truth. |
| **Boundary card** | A stated limit on how an assistant should behave toward the user, e.g. "do not diagnose me." |
| **Project card** | A fact about a specific project: name, objective, active decisions. |
| **Fossil trace** | A structured behavioral signal, never raw conversation text. The CLI alias `fossil` maps to the internal kind `fossil_trace`; `fossil_card` does not exist. The only card kind allowed under the `fossil_only` scope. |
| **Handoff card** | A richer, separate object (`packages/core/handoff.ts`) carrying decisions, open questions, and boundaries from one conversation, meant to be picked up — never obeyed — by another assistant. |
| **Context pack** | The scoped export built from cards for a target (`packages/core/context_pack.ts`, schema `0.3`). Available as Markdown or JSON. Not identity. |
| **Target profile** | Bounded receiving metadata for ChatGPT, Claude, Gemini, or a generic assistant. It changes presentation only and cannot change scope, policy, or authority. |
| **Handoff export** | A JSON transport wrapper containing a handoff card plus its target profile. The stored handoff card remains a separate object. |
| **Trust receipt** | A record of one past export: target, scope, cards exported, whether authored card content was included, and the invariant that raw conversation was not (`packages/core/receipts.ts`). Does not authorize future exports. |
| **Revocation record** | A local audit record written when a card or handoff is revoked. It proves removal from this vault; it does not claim remote recall. |
| **Scope** | One of `minimal`, `project`, `handoff`, `deep`, `fossil_only` — decides which cards may appear in a context pack (`packages/core/scopes.ts`, `docs/scopes.md`). |
| **Continuity envelope** | The fixed policy attached to anything that would leave the vault toward an external host (`packages/core/policy.ts`). It distinguishes `raw_conversation_included` (always `false`) from `card_content_included`. |
| **Vault** | The local `.doppelganger/` directory holding the manifest, cards, handoffs, receipts, revocations, and config (`packages/core/vault.ts`). V0 is plain files; encryption is a later milestone. |
| **Quark host** | An external system (Quark-AI, or any future host) that may receive a deposit. Receiving a deposit does not make it the owner of that context. |
| **Dry run** | A preview of what a deposit would contain, computed and printed entirely locally, with no network call (`doppel quark dry-run`). |

## Objects that must never be confused

See `docs/doctrine.md` for the four-object table (Memory Card, Fossil
Trace, Handoff Card, Trust Receipt) and why they are stored separately.
