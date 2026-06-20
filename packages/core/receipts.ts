/**
 * receipts.ts — the receipt of every export. Protects the user and protects
 * the host on the other end: a record of exactly what left the vault, when,
 * and to whom.
 *
 * Receipt != permanent consent — a receipt records a single past export,
 * it does not authorize any future one.
 */
import { randomBytes } from "crypto";

export interface TrustReceipt {
  id: string;
  kind: "trust_receipt";
  target: string;
  scope: string;
  cards_exported: string[];
  /** Kept separate so a handoff is never mislabeled as a generic card. */
  handoffs_exported: string[];
  raw_conversation_included: false;
  card_content_included: boolean;
  created_at: string;
}

export interface CreateReceiptOptions {
  target: string;
  scope: string;
  cardsExported: string[];
  handoffsExported?: string[];
  cardContentIncluded: boolean;
}

export function createReceipt(options: CreateReceiptOptions): TrustReceipt {
  return {
    id: `rcpt_${randomBytes(6).toString("hex")}`,
    kind: "trust_receipt",
    target: options.target,
    scope: options.scope,
    cards_exported: options.cardsExported,
    handoffs_exported: options.handoffsExported ?? [],
    raw_conversation_included: false,
    card_content_included: options.cardContentIncluded,
    created_at: new Date().toISOString(),
  };
}

export function formatReceiptLine(receipt: TrustReceipt): string {
  return (
    `${receipt.created_at}  ${receipt.id}  target=${receipt.target}  scope=${receipt.scope}  ` +
    `cards=${receipt.cards_exported.length}  handoffs=${receipt.handoffs_exported.length}  ` +
    `raw_conversation_included=${receipt.raw_conversation_included}  ` +
    `card_content_included=${receipt.card_content_included}`
  );
}

export function formatReceiptDetails(receipt: TrustReceipt): string {
  return [
    `Receipt: ${receipt.id}`,
    `Created: ${receipt.created_at}`,
    `Target: ${receipt.target}`,
    `Scope: ${receipt.scope}`,
    `Cards exported: ${receipt.cards_exported.length ? receipt.cards_exported.join(", ") : "none"}`,
    `Handoffs exported: ${
      receipt.handoffs_exported.length ? receipt.handoffs_exported.join(", ") : "none"
    }`,
    `Raw conversation included: ${receipt.raw_conversation_included}`,
    `Card content included: ${receipt.card_content_included}`,
    "",
    "This receipt records one past export. It grants no future consent.",
    "",
  ].join("\n");
}
