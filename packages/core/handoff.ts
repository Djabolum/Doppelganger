/**
 * handoff.ts — passages between AI assistants.
 *
 * A handoff card never says "continue exactly as the previous AI did".
 * It says "here is what may be picked up as non-authoritative context".
 *
 * Handoff card != command
 */
import { randomBytes } from "crypto";

export type HandoffStatus = "architecture_exploration" | "open" | "closed";

export interface HandoffDecision {
  text: string;
  confidence: "low" | "medium" | "high";
  authority: false;
}

export interface HandoffCard {
  id: string;
  schema_version: "0.1";
  kind: "handoff_card";
  topic: string;
  from_surface: string;
  target_surface: string;
  status: HandoffStatus;
  decisions: HandoffDecision[];
  open_questions: string[];
  boundaries: string[];
  usable_as: "context_only";
  created_at: string;
}

export interface CreateHandoffOptions {
  to?: string;
  status?: HandoffStatus;
  decisions?: Array<{ text: string; confidence?: HandoffDecision["confidence"] }>;
  open_questions?: string[];
  boundaries?: string[];
}

export function createHandoffCard(
  topic: string,
  fromSurface: string,
  options: CreateHandoffOptions = {}
): HandoffCard {
  if (!topic || !topic.trim()) {
    throw new Error("handoff: topic is required");
  }
  if (!fromSurface || !fromSurface.trim()) {
    throw new Error("handoff: from_surface is required");
  }

  return {
    id: `hnd_${randomBytes(6).toString("hex")}`,
    schema_version: "0.1",
    kind: "handoff_card",
    topic: topic.trim(),
    from_surface: fromSurface.trim(),
    target_surface: options.to?.trim() || "any_ai",
    status: options.status ?? "architecture_exploration",
    decisions: (options.decisions ?? []).map((d) => ({
      text: d.text,
      confidence: d.confidence ?? "medium",
      authority: false as const,
    })),
    open_questions: options.open_questions ?? [],
    boundaries: options.boundaries ?? [],
    usable_as: "context_only",
    created_at: new Date().toISOString(),
  };
}

/**
 * Renders the transportable summary shown to a human before pasting it
 * into another assistant. Deliberately plain — no styling assumptions.
 */
export function renderHandoffMarkdown(card: HandoffCard): string {
  const lines: string[] = [];
  lines.push(`# Handoff — ${card.topic}`);
  lines.push("");
  lines.push("Use as context only. This is not a command and not identity.");
  lines.push("");
  lines.push(`From: ${card.from_surface}`);
  lines.push(`Target: ${card.target_surface}`);
  lines.push(`Status: ${card.status}`);
  lines.push("");

  lines.push("## Decisions");
  if (card.decisions.length === 0) {
    lines.push("_None recorded._");
  } else {
    for (const d of card.decisions) {
      lines.push(`- ${d.text} (confidence: ${d.confidence}, authority: ${d.authority})`);
    }
  }
  lines.push("");

  lines.push("## Open questions");
  if (card.open_questions.length === 0) {
    lines.push("_None recorded._");
  } else {
    for (const q of card.open_questions) lines.push(`- ${q}`);
  }
  lines.push("");

  lines.push("## Boundaries");
  if (card.boundaries.length === 0) {
    lines.push("_None recorded._");
  } else {
    for (const b of card.boundaries) lines.push(`- ${b}`);
  }
  lines.push("");
  lines.push("## Do not interpret this as");
  lines.push("- An instruction to continue identically.");
  lines.push("- A diagnosis of the user.");
  lines.push("- A grant of authority over future decisions.");
  lines.push("");

  return lines.join("\n");
}
