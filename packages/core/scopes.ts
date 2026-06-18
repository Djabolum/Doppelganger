/**
 * scopes.ts — decides what is allowed to circulate.
 *
 * Five scopes, ordered loosely from narrowest to richest, except
 * fossil_only which is a different axis entirely (structure, not content).
 */
import { Card } from "./cards";
import { HandoffCard } from "./handoff";

export type ScopeName = "minimal" | "project" | "handoff" | "deep" | "fossil_only";

export const SCOPES: readonly ScopeName[] = ["minimal", "project", "handoff", "deep", "fossil_only"];

export interface ScopeDefinition {
  name: ScopeName;
  description: string;
}

export const SCOPE_DEFINITIONS: Record<ScopeName, ScopeDefinition> = {
  minimal: {
    name: "minimal",
    description: "General preferences and global boundaries only. No sensitive content, no raw text.",
  },
  project: {
    name: "project",
    description: "Project cards, active decisions, and boundary cards.",
  },
  handoff: {
    name: "handoff",
    description: "Decisions, open questions, and boundaries from a previous conversation's handoff card.",
  },
  deep: {
    name: "deep",
    description: "Everything in project, plus cards explicitly marked deep_allowed. Never the default.",
  },
  fossil_only: {
    name: "fossil_only",
    description: "No readable sensitive content at all — only structured signals (fossil_trace cards).",
  },
};

/** Whether a single card is allowed to appear under a given scope. */
export function isCardAllowedInScope(card: Card, scope: ScopeName): boolean {
  switch (scope) {
    case "minimal":
      return (
        (card.kind === "memory_card" || card.kind === "boundary_card") &&
        card.sensitivity !== "sensitive"
      );
    case "project":
      return (
        (card.kind === "project_card" || card.kind === "boundary_card") &&
        card.sensitivity !== "sensitive"
      );
    case "handoff":
      // Generic cards are not part of the handoff scope — handoff cards carry their own content.
      return false;
    case "deep":
      return card.deep_allowed === true || card.kind === "project_card" || card.kind === "boundary_card";
    case "fossil_only":
      return card.kind === "fossil_trace";
    default:
      return false;
  }
}

export function filterCardsForScope(cards: Card[], scope: ScopeName): Card[] {
  return cards.filter((card) => isCardAllowedInScope(card, scope));
}

/**
 * fossil_only strips readable content even from cards that are otherwise
 * allowed (defense in depth — a fossil_trace card should not carry
 * conversational text, but we never assume the caller did that already).
 */
export function projectCardForScope(card: Card, scope: ScopeName): Card {
  if (scope === "fossil_only") {
    return { ...card, content: undefined };
  }
  return card;
}

export function filterHandoffsForScope(handoffs: HandoffCard[], scope: ScopeName): HandoffCard[] {
  if (scope !== "handoff") return [];
  return handoffs;
}
