/**
 * Runtime validation for data loaded from the vault.
 *
 * TypeScript types disappear at runtime. These validators mirror the public
 * JSON schemas and add the doctrine checks that schemas alone cannot express.
 */
import type { Card, CardKind } from "./cards";
import type { HandoffCard, HandoffStatus } from "./handoff";
import type { IdentityAnchor, IdentityAnchorKind } from "./identity";
import { assertCardInvariants, assertHandoffInvariants } from "./policy";
import type { TrustReceipt } from "./receipts";
import type { Manifest, RevocationRecord, VaultConfig } from "./vault";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, where: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${where}: expected an object`);
  return value;
}

function rejectUnknownKeys(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  where: string
): void {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(obj).filter((key) => !allowedSet.has(key));
  if (unknown.length > 0) {
    throw new Error(`${where}: unknown field(s): ${unknown.join(", ")}`);
  }
}

function requireString(value: unknown, where: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${where}: expected a non-empty string`);
  }
  return value;
}

function requireBoolean(value: unknown, where: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${where}: expected a boolean`);
  return value;
}

function requireStringArray(value: unknown, where: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${where}: expected an array of strings`);
  }
  return value;
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[], where: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${where}: expected one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function requireIsoDate(value: unknown, where: string): string {
  const text = requireString(value, where);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${where}: expected an ISO date-time`);
  return text;
}

const CARD_KINDS: readonly CardKind[] = [
  "memory_card",
  "boundary_card",
  "project_card",
  "fossil_trace",
];
const CARD_PREFIX: Record<CardKind, string> = {
  memory_card: "mem",
  boundary_card: "bnd",
  project_card: "prj",
  fossil_trace: "fos",
};

export function validateCard(value: unknown, where = "card"): Card {
  const obj = requireRecord(value, where);
  rejectUnknownKeys(
    obj,
    [
      "id",
      "kind",
      "label",
      "content",
      "sensitivity",
      "deep_allowed",
      "authority",
      "revocable",
      "created_at",
      "updated_at",
    ],
    where
  );
  const kind = requireEnum(obj.kind, CARD_KINDS, `${where}.kind`);
  const card: Card = {
    id: requireString(obj.id, `${where}.id`),
    kind,
    label: requireString(obj.label, `${where}.label`),
    content: obj.content === undefined ? undefined : requireString(obj.content, `${where}.content`),
    sensitivity: requireEnum(
      obj.sensitivity,
      ["public", "normal", "sensitive"] as const,
      `${where}.sensitivity`
    ),
    deep_allowed: requireBoolean(obj.deep_allowed, `${where}.deep_allowed`),
    authority: requireBoolean(obj.authority, `${where}.authority`) as false,
    revocable: requireBoolean(obj.revocable, `${where}.revocable`) as true,
    created_at: requireIsoDate(obj.created_at, `${where}.created_at`),
    updated_at: requireIsoDate(obj.updated_at, `${where}.updated_at`),
  };
  if (!new RegExp(`^${CARD_PREFIX[kind]}_[0-9a-f]+$`).test(card.id)) {
    throw new Error(`${where}.id: prefix does not match kind ${kind}`);
  }
  assertCardInvariants(card, where);
  return card;
}

const HANDOFF_STATUSES: readonly HandoffStatus[] = ["architecture_exploration", "open", "closed"];

export function validateHandoff(value: unknown, where = "handoff"): HandoffCard {
  const obj = requireRecord(value, where);
  rejectUnknownKeys(
    obj,
    [
      "id",
      "schema_version",
      "kind",
      "topic",
      "from_surface",
      "target_surface",
      "status",
      "decisions",
      "open_questions",
      "boundaries",
      "usable_as",
      "created_at",
    ],
    where
  );
  if (!Array.isArray(obj.decisions)) throw new Error(`${where}.decisions: expected an array`);
  const decisions = obj.decisions.map((entry, index) => {
    const decision = requireRecord(entry, `${where}.decisions[${index}]`);
    rejectUnknownKeys(
      decision,
      ["text", "confidence", "authority"],
      `${where}.decisions[${index}]`
    );
    return {
      text: requireString(decision.text, `${where}.decisions[${index}].text`),
      confidence: requireEnum(
        decision.confidence,
        ["low", "medium", "high"] as const,
        `${where}.decisions[${index}].confidence`
      ),
      authority: requireBoolean(
        decision.authority,
        `${where}.decisions[${index}].authority`
      ) as false,
    };
  });
  const handoff: HandoffCard = {
    id: requireString(obj.id, `${where}.id`),
    schema_version: requireEnum(obj.schema_version, ["0.1"] as const, `${where}.schema_version`),
    kind: requireEnum(obj.kind, ["handoff_card"] as const, `${where}.kind`),
    topic: requireString(obj.topic, `${where}.topic`),
    from_surface: requireString(obj.from_surface, `${where}.from_surface`),
    target_surface: requireString(obj.target_surface, `${where}.target_surface`),
    status: requireEnum(obj.status, HANDOFF_STATUSES, `${where}.status`),
    decisions,
    open_questions: requireStringArray(obj.open_questions, `${where}.open_questions`),
    boundaries: requireStringArray(obj.boundaries, `${where}.boundaries`),
    usable_as: requireEnum(obj.usable_as, ["context_only"] as const, `${where}.usable_as`),
    created_at: requireIsoDate(obj.created_at, `${where}.created_at`),
  };
  if (!/^hnd_[0-9a-f]+$/.test(handoff.id)) throw new Error(`${where}.id: invalid handoff id`);
  assertHandoffInvariants(handoff, where);
  return handoff;
}

export function validateIdentityAnchor(value: unknown, where = "identity"): IdentityAnchor {
  const obj = requireRecord(value, where);
  rejectUnknownKeys(obj, ["kind", "pseudonymous_id", "authority", "created_at"], where);
  const identity: IdentityAnchor = {
    kind: requireEnum(
      obj.kind,
      ["local", "email_hash", "passkey_hash"] as readonly IdentityAnchorKind[],
      `${where}.kind`
    ),
    pseudonymous_id: requireString(obj.pseudonymous_id, `${where}.pseudonymous_id`),
    authority: requireBoolean(obj.authority, `${where}.authority`) as false,
    created_at: requireIsoDate(obj.created_at, `${where}.created_at`),
  };
  if (identity.authority !== false) throw new Error(`${where}.authority must be false`);
  return identity;
}

export function validateManifest(value: unknown, where = "manifest"): Manifest {
  const obj = requireRecord(value, where);
  rejectUnknownKeys(
    obj,
    ["schema_version", "kind", "identity", "created_at", "vault_version"],
    where
  );
  const identity = validateIdentityAnchor(obj.identity, `${where}.identity`);
  if (identity.authority !== false) throw new Error(`${where}.identity.authority must be false`);
  return {
    schema_version: requireEnum(obj.schema_version, ["0.1"] as const, `${where}.schema_version`),
    kind: requireEnum(obj.kind, ["manifest"] as const, `${where}.kind`),
    identity,
    created_at: requireIsoDate(obj.created_at, `${where}.created_at`),
    vault_version: requireEnum(
      obj.vault_version,
      ["v0_local_file_storage"] as const,
      `${where}.vault_version`
    ),
  };
}

export function validateVaultConfig(value: unknown, where = "config"): VaultConfig {
  const obj = requireRecord(value, where);
  rejectUnknownKeys(obj, ["mode", "quark_sync", "raw_text_capture"], where);
  return {
    mode: requireEnum(obj.mode, ["local-only"] as const, `${where}.mode`),
    quark_sync: requireEnum(obj.quark_sync, ["disabled", "enabled"] as const, `${where}.quark_sync`),
    raw_text_capture: requireEnum(
      obj.raw_text_capture,
      ["disabled", "enabled"] as const,
      `${where}.raw_text_capture`
    ),
  };
}

export function validateReceipt(value: unknown, where = "receipt"): TrustReceipt {
  const obj = requireRecord(value, where);
  rejectUnknownKeys(
    obj,
    [
      "id",
      "kind",
      "target",
      "scope",
      "cards_exported",
      "handoffs_exported",
      "raw_conversation_included",
      "card_content_included",
      // Legacy V1 receipt field. Read and normalize; never write it again.
      "raw_text_included",
      "created_at",
    ],
    where
  );
  if (
    obj.raw_text_included !== undefined &&
    (obj.raw_conversation_included !== undefined || obj.card_content_included !== undefined)
  ) {
    throw new Error(`${where}: legacy and current content disclosure fields cannot be mixed`);
  }
  const legacyRawText =
    obj.raw_text_included === undefined
      ? undefined
      : requireBoolean(obj.raw_text_included, `${where}.raw_text_included`);
  const receipt: TrustReceipt = {
    id: requireString(obj.id, `${where}.id`),
    kind: requireEnum(obj.kind, ["trust_receipt"] as const, `${where}.kind`),
    target: requireString(obj.target, `${where}.target`),
    scope: requireEnum(
      obj.scope,
      ["minimal", "project", "handoff", "deep", "fossil_only"] as const,
      `${where}.scope`
    ),
    cards_exported: requireStringArray(obj.cards_exported, `${where}.cards_exported`),
    handoffs_exported:
      obj.handoffs_exported === undefined
        ? []
        : requireStringArray(obj.handoffs_exported, `${where}.handoffs_exported`),
    raw_conversation_included:
      legacyRawText === undefined
        ? (requireBoolean(
            obj.raw_conversation_included,
            `${where}.raw_conversation_included`
          ) as false)
        : false,
    card_content_included:
      legacyRawText ??
      requireBoolean(obj.card_content_included, `${where}.card_content_included`),
    created_at: requireIsoDate(obj.created_at, `${where}.created_at`),
  };
  if (receipt.raw_conversation_included !== false) {
    throw new Error(`${where}.raw_conversation_included must be false`);
  }
  if (!/^rcpt_[0-9a-f]+$/.test(receipt.id)) throw new Error(`${where}.id: invalid receipt id`);
  return receipt;
}

export function validateRevocation(value: unknown, where = "revocation"): RevocationRecord {
  const obj = requireRecord(value, where);
  rejectUnknownKeys(
    obj,
    ["id", "kind", "artifact_id", "artifact_kind", "reason", "revoked_at"],
    where
  );
  const record: RevocationRecord = {
    id: requireString(obj.id, `${where}.id`),
    kind: requireEnum(
      obj.kind,
      ["card_revocation", "handoff_revocation"] as const,
      `${where}.kind`
    ),
    artifact_id: requireString(obj.artifact_id, `${where}.artifact_id`),
    artifact_kind: requireString(obj.artifact_kind, `${where}.artifact_kind`),
    reason: obj.reason === undefined ? undefined : requireString(obj.reason, `${where}.reason`),
    revoked_at: requireIsoDate(obj.revoked_at, `${where}.revoked_at`),
  };
  if (!/^rev_[0-9a-f]+$/.test(record.id)) throw new Error(`${where}.id: invalid revocation id`);
  return record;
}
