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
  raw_text_included: boolean;
  created_at: string;
}

export interface CreateReceiptOptions {
  target: string;
  scope: string;
  cardsExported: string[];
  rawTextIncluded: boolean;
}

export function createReceipt(options: CreateReceiptOptions): TrustReceipt {
  return {
    id: `rcpt_${randomBytes(6).toString("hex")}`,
    kind: "trust_receipt",
    target: options.target,
    scope: options.scope,
    cards_exported: options.cardsExported,
    raw_text_included: options.rawTextIncluded,
    created_at: new Date().toISOString(),
  };
}

export function formatReceiptLine(receipt: TrustReceipt): string {
  return (
    `${receipt.created_at}  ${receipt.id}  target=${receipt.target}  scope=${receipt.scope}  ` +
    `cards=${receipt.cards_exported.length}  raw_text_included=${receipt.raw_text_included}`
  );
}
