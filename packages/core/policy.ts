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
  authority: boolean;
  revocable: boolean;
}

export function assertCardInvariants(card: CardLike, where = "card"): void {
  assertNoAuthority(card.authority, where);
  if (card.revocable !== true) {
    throw new PolicyViolationError(
      `${where}: revocable must be true. Every card must remain revocable by the user.`
    );
  }
}

export interface ExportPolicyLike {
  authority: boolean;
  memory_write_allowed: boolean;
  activation_allowed: boolean;
  raw_text_included: boolean;
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
}

export interface ContinuityEnvelope {
  authority: boolean;
  memory_authority: boolean;
  decision_authority: boolean;
  activation_allowed: boolean;
  raw_text_included: boolean;
  revocable: boolean;
  source: "doppelganger";
}

/** Built once, used by every adapter that ever talks to an external host (Quark or otherwise). */
export function buildContinuityEnvelope(rawTextIncluded: boolean): ContinuityEnvelope {
  return {
    authority: false,
    memory_authority: false,
    decision_authority: false,
    activation_allowed: false,
    raw_text_included: rawTextIncluded,
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
