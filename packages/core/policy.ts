/**
 * policy.ts — the non-negotiable invariants of Doppelganger.
 *
 * Every other module in packages/core must pass through here before
 * anything is persisted or exported. This file has no I/O of its own.
 */

export const POLICY_INVARIANTS: readonly string[] = [
  "Doppelganger != user",
  "Doppelganger != autonomous agent",
  "Doppelganger != full memory",
  "Context pack != identity",
  "Memory card != truth",
  "Handoff card != command",
  "Receipt != permanent consent",
  "Quark host != owner",
  "Fossil trace != raw conversation",
  "AI-to-AI continuity != AI-to-AI autonomy",
];

export class PolicyViolationError extends Error {
  constructor(message: string) {
    super(`[policy violation] ${message}`);
    this.name = "PolicyViolationError";
  }
}

/** Anything carrying a declared authority flag must declare it as false. */
export function assertNoAuthority(value: unknown, where: string): void {
  if (value === true) {
    throw new PolicyViolationError(
      `${where}: authority must never be true. Doppelganger never carries decision, ` +
        `memory-write, or activation authority.`
    );
  }
}

export interface CardLike {
  kind: string;
  label: string;
  content?: string;
  authority: boolean;
  revocable: boolean;
}

/** A fossil_trace is a structural signal, never readable narrative text. */
const FOSSIL_LABEL_MAX_LENGTH = 60;

/**
 * The single chokepoint every Card must pass through before it is persisted,
 * regardless of which module constructed it. cards.ts::createCard calls this
 * on every card it builds, and vault.ts::saveCard calls it again at the
 * write boundary — so a Card built any other way (import, migration, a
 * future "card edit") is checked too, not just the one CLI-facing
 * constructor.
 */
export function assertCardInvariants(card: CardLike, where = "card"): void {
  assertNoAuthority(card.authority, where);
  if (card.revocable !== true) {
    throw new PolicyViolationError(
      `${where}: revocable must be true. Every card must remain revocable by the user.`
    );
  }
  if (card.kind === "fossil_trace") {
    if (card.content) {
      throw new PolicyViolationError(
        `${where}: fossil_trace cannot carry content. A fossil_trace is a structural signal ` +
          `(a short label naming a recurring pattern), never readable narrative text — that is ` +
          `what memory_card is for. Mixing the two turns the fossil store back into user memory. ` +
          `See docs/doctrine.md.`
      );
    }
    if (card.label.length > FOSSIL_LABEL_MAX_LENGTH) {
      throw new PolicyViolationError(
        `${where}: fossil_trace label must be a short pattern name, not narrative text ` +
          `(max ${FOSSIL_LABEL_MAX_LENGTH} characters, got ${card.label.length}). See docs/doctrine.md.`
      );
    }
  }
}

export interface ExportPolicyLike {
  authority: boolean;
  memory_write_allowed: boolean;
  activation_allowed: boolean;
  raw_conversation_included: false;
  card_content_included: boolean;
}

/**
 * Context packs and handoff exports may never claim authority, may never
 * write memory, may never activate anything, and — outside fossil_only —
 * must declare explicitly whether raw text is included.
 */
export function assertExportPolicy(policy: ExportPolicyLike, where = "export"): void {
  assertNoAuthority(policy.authority, where);
  if (policy.memory_write_allowed === true) {
    throw new PolicyViolationError(`${where}: memory_write_allowed must be false.`);
  }
  if (policy.activation_allowed === true) {
    throw new PolicyViolationError(`${where}: activation_allowed must be false.`);
  }
  if (policy.raw_conversation_included !== false) {
    throw new PolicyViolationError(
      `${where}: raw_conversation_included must be false. Doppelganger does not capture conversations.`
    );
  }
}

export interface ContinuityEnvelope {
  authority: boolean;
  memory_authority: boolean;
  decision_authority: boolean;
  activation_allowed: boolean;
  raw_conversation_included: false;
  card_content_included: boolean;
  revocable: boolean;
  source: "doppelganger";
}

/** Built once, used by every adapter that ever talks to an external host (Quark or otherwise). */
export function buildContinuityEnvelope(cardContentIncluded: boolean): ContinuityEnvelope {
  return {
    authority: false,
    memory_authority: false,
    decision_authority: false,
    activation_allowed: false,
    raw_conversation_included: false,
    card_content_included: cardContentIncluded,
    revocable: true,
    source: "doppelganger",
  };
}

export function assertContinuityEnvelope(envelope: ContinuityEnvelope, where = "deposit"): void {
  assertNoAuthority(envelope.authority, where);
  assertNoAuthority(envelope.memory_authority, where);
  assertNoAuthority(envelope.decision_authority, where);
  assertNoAuthority(envelope.activation_allowed, where);
  if (envelope.revocable !== true) {
    throw new PolicyViolationError(`${where}: revocable must be true on every deposit envelope.`);
  }
}

export interface HandoffLike {
  usable_as: string;
  decisions: Array<{ authority: boolean }>;
}

/** Handoff cards never carry authority, and are never usable as anything but context. */
export function assertHandoffInvariants(handoff: HandoffLike, where = "handoff"): void {
  if (handoff.usable_as !== "context_only") {
    throw new PolicyViolationError(`${where}: usable_as must be "context_only".`);
  }
  for (const decision of handoff.decisions) {
    assertNoAuthority(decision.authority, `${where}.decisions[]`);
  }
}
