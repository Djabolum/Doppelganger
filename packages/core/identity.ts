/**
 * identity.ts — a local, pseudonymous anchor. Never a user identity.
 *
 * identity_anchor != access
 * identity_anchor != ownership proof
 * identity_anchor != user identity
 */
import { randomBytes, createHash } from "crypto";

export type IdentityAnchorKind = "local" | "email_hash" | "passkey_hash";

export interface IdentityAnchor {
  kind: IdentityAnchorKind;
  pseudonymous_id: string;
  authority: false;
  created_at: string;
}

/**
 * Creates a local pseudonymous anchor.
 *
 * - kind "local": a random id, no relationship to any real-world identifier.
 * - kind "email_hash" / "passkey_hash": a one-way hash of a seed the caller
 *   already holds (e.g. an email address or passkey public id). The seed is
 *   never stored — only its hash is.
 */
export function createIdentityAnchor(kind: IdentityAnchorKind = "local", seed?: string): IdentityAnchor {
  let pseudonymous_id: string;

  if (kind === "local") {
    pseudonymous_id = `anon_${randomBytes(16).toString("hex")}`;
  } else {
    if (!seed) {
      throw new Error(`identity: kind "${kind}" requires a seed to hash`);
    }
    pseudonymous_id = `${kind}_${createHash("sha256").update(seed).digest("hex")}`;
  }

  return {
    kind,
    pseudonymous_id,
    authority: false,
    created_at: new Date().toISOString(),
  };
}
