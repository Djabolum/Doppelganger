/**
 * Strict, local parser for user-authored Markdown cards.
 *
 * Authored Markdown is untrusted input. This module accepts a deliberately
 * small front-matter subset, rejects unknown fields, and creates cards only
 * through the canonical constructor and policy chokepoint.
 */
import * as fs from "fs";
import * as path from "path";
import { Card, createCard, resolveCardKind, Sensitivity } from "./cards";

const ALLOWED_FIELDS = new Set(["kind", "label", "sensitivity", "deep_allowed"]);
const IMPORTABLE_KINDS = new Set(["memory", "boundary", "project"]);

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseBoolean(value: string, field: string): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`markdown import: ${field} must be true or false`);
}

function assertSafeMarkdownBody(body: string): void {
  if (/<\s*(script|iframe|object|embed)\b/i.test(body)) {
    throw new Error("markdown import: embedded executable HTML is not allowed");
  }
  if (/!\[[^\]]*\]\(\s*https?:\/\//i.test(body)) {
    throw new Error("markdown import: remote embedded images are not allowed");
  }
}

export function parseMarkdownCard(source: string, where = "markdown input"): Card {
  const normalized = source.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0] !== "---") {
    throw new Error(`markdown import: ${where} must start with a --- front matter block`);
  }

  const closing = lines.indexOf("---", 1);
  if (closing === -1) {
    throw new Error(`markdown import: ${where} is missing the closing ---`);
  }

  const fields = new Map<string, string>();
  for (let index = 1; index < closing; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;
    const match = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!match) {
      throw new Error(`markdown import: invalid front matter line ${index + 1}`);
    }
    const [, key, rawValue] = match;
    if (!ALLOWED_FIELDS.has(key)) {
      throw new Error(`markdown import: unknown front matter field "${key}"`);
    }
    if (fields.has(key)) {
      throw new Error(`markdown import: duplicate front matter field "${key}"`);
    }
    fields.set(key, parseScalar(rawValue));
  }

  const kindAlias = fields.get("kind");
  const label = fields.get("label");
  if (!kindAlias) throw new Error("markdown import: kind is required");
  if (!IMPORTABLE_KINDS.has(kindAlias)) {
    throw new Error(
      "markdown import: kind must be memory, boundary, or project; " +
        "fossil traces and handoffs require dedicated structures"
    );
  }
  if (!label?.trim()) throw new Error("markdown import: label is required");

  const sensitivityText = fields.get("sensitivity") ?? "normal";
  if (!["public", "normal", "sensitive"].includes(sensitivityText)) {
    throw new Error("markdown import: sensitivity must be public, normal, or sensitive");
  }

  const deepAllowedText = fields.get("deep_allowed") ?? "false";
  const body = lines.slice(closing + 1).join("\n").trim();
  assertSafeMarkdownBody(body);

  return createCard(resolveCardKind(kindAlias), label, {
    content: body || undefined,
    sensitivity: sensitivityText as Sensitivity,
    deep_allowed: parseBoolean(deepAllowedText, "deep_allowed"),
  });
}

export function loadMarkdownCard(filePath: string): { card: Card; file: string } {
  const resolved = path.resolve(filePath);
  let source: string;
  try {
    source = fs.readFileSync(resolved, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`markdown import: cannot read ${resolved}: ${detail}`);
  }
  return { card: parseMarkdownCard(source, resolved), file: resolved };
}
