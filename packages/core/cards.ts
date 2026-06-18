/**
 * cards.ts — the living objects. Generic, low-ceremony notes the user
 * chooses to keep: a preference, a boundary, a project fact, a fossil
 * signal. NOT a handoff card (see handoff.ts — richer, transport-oriented).
 *
 * memory_card != truth
 *
 * memory_card != fossil_trace — this is enforced here, not just documented.
 * A memory_card holds readable meaning ("the user prefers structured
 * replies"). A fossil_trace holds a structural signal about a recurring
 * pattern ("this theme recurs with stability across contexts") — never
 * free narrative text. createCard() refuses a `content` string on
 * fossil_trace for exactly this reason: blending the two is how a fossil
 * store quietly becomes "user memory" again, which the doctrine forbids.
 */
import { randomBytes } from "crypto";

export type CardKind = "memory_card" | "boundary_card" | "project_card" | "fossil_trace";

export type Sensitivity = "public" | "normal" | "sensitive";

export interface Card {
  id: string;
  kind: CardKind;
  label: string;
  content?: string;
  sensitivity: Sensitivity;
  /** Only true once explicitly marked allowed for the "deep" scope. Default false. */
  deep_allowed: boolean;
  authority: false;
  revocable: true;
  created_at: string;
  updated_at: string;
}

const KIND_PREFIX: Record<CardKind, string> = {
  memory_card: "mem",
  boundary_card: "bnd",
  project_card: "prj",
  fossil_trace: "fos",
};

export interface CreateCardOptions {
  content?: string;
  sensitivity?: Sensitivity;
  deep_allowed?: boolean;
}

export function createCard(kind: CardKind, label: string, options: CreateCardOptions = {}): Card {
  if (!label || !label.trim()) {
    throw new Error("cards: label is required");
  }
  if (kind === "fossil_trace" && options.content) {
    throw new Error(
      "cards: fossil_trace cannot carry --content. A fossil_trace is a structural signal " +
        "(a short label naming a recurring pattern), never readable narrative text — that is " +
        "what memory_card is for. Mixing the two turns the fossil store back into user memory. " +
        "See docs/doctrine.md."
    );
  }
  const now = new Date().toISOString();
  return {
    id: `${KIND_PREFIX[kind]}_${randomBytes(6).toString("hex")}`,
    kind,
    label: label.trim(),
    content: options.content,
    sensitivity: options.sensitivity ?? "normal",
    deep_allowed: options.deep_allowed ?? false,
    authority: false,
    revocable: true,
    created_at: now,
    updated_at: now,
  };
}

export function touchCard(card: Card): Card {
  return { ...card, updated_at: new Date().toISOString() };
}

/** Accepts the short aliases used by the CLI (memory|boundary|project|fossil). */
export function resolveCardKind(alias: string): CardKind {
  const normalized = alias.trim().toLowerCase();
  const map: Record<string, CardKind> = {
    memory: "memory_card",
    memory_card: "memory_card",
    boundary: "boundary_card",
    boundary_card: "boundary_card",
    project: "project_card",
    project_card: "project_card",
    fossil: "fossil_trace",
    fossil_trace: "fossil_trace",
  };
  const resolved = map[normalized];
  if (!resolved) {
    throw new Error(
      `cards: unknown card kind "${alias}" (expected one of memory, boundary, project, fossil)`
    );
  }
  return resolved;
}
