/**
 * adapters/file-export — V0's only fully-implemented adapter.
 *
 * Exports markdown or JSON to a path the user chose, or attempts a
 * best-effort copy to the OS clipboard. No network calls live here.
 */
import * as fs from "fs";
import * as path from "path";
import { spawnSync } from "child_process";

export function exportMarkdown(content: string, filePath: string): string {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(resolved, 0o600);
  return resolved;
}

export function exportJson(value: unknown, filePath: string): string {
  const resolved = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(value, null, 2) + "\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.chmodSync(resolved, 0o600);
  return resolved;
}

export interface ClipboardResult {
  copied: boolean;
  tool?: string;
  reason?: string;
}

/**
 * Best-effort clipboard copy. Tries the common Linux/macOS/Windows tools in
 * order; if none are available it returns copied=false with a reason
 * instead of throwing — clipboard access is a convenience, not a contract.
 */
export function copyToClipboard(content: string): ClipboardResult {
  const candidates: Array<{ tool: string; cmd: string; args: string[] }> = [
    { tool: "pbcopy", cmd: "pbcopy", args: [] },
    { tool: "wl-copy", cmd: "wl-copy", args: [] },
    { tool: "xclip", cmd: "xclip", args: ["-selection", "clipboard"] },
    { tool: "clip", cmd: "clip", args: [] },
  ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.cmd, candidate.args, {
      input: content,
      stdio: ["pipe", "ignore", "ignore"],
    });
    if (!result.error && result.status === 0) {
      return { copied: true, tool: candidate.tool };
    }
  }

  return {
    copied: false,
    reason: "No clipboard tool found (tried pbcopy, wl-copy, xclip, clip). Use --out <file> instead.",
  };
}
