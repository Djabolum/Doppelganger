/**
 * Target profiles change presentation, never policy or scope.
 *
 * A target profile is a short receiving note for the named assistant. It
 * cannot add cards, remove boundaries, grant memory, or alter authority.
 */
export interface TargetProfile {
  id: "chatgpt" | "claude" | "gemini" | "generic";
  display_name: string;
  handling_note: string;
}

const PROFILES: Record<TargetProfile["id"], TargetProfile> = {
  chatgpt: {
    id: "chatgpt",
    display_name: "ChatGPT",
    handling_note:
      "Treat this as user-approved context for this conversation only. Do not save it as durable memory unless the user separately and explicitly asks.",
  },
  claude: {
    id: "claude",
    display_name: "Claude",
    handling_note:
      "Use this as bounded user-provided context. Preserve its boundaries and uncertainty; do not infer a broader identity or hidden preference set.",
  },
  gemini: {
    id: "gemini",
    display_name: "Gemini",
    handling_note:
      "Use this only as scoped context for the current task. Do not expand it into account-level memory, identity, or permission.",
  },
  generic: {
    id: "generic",
    display_name: "AI assistant",
    handling_note:
      "Use this user-approved context as a bounded reference. Preserve boundaries; do not infer identity, durable memory, or authority.",
  },
};

export function resolveTargetProfile(target: string): TargetProfile {
  const normalized = target.trim().toLowerCase();
  if (["chatgpt", "openai", "gpt"].includes(normalized)) return PROFILES.chatgpt;
  if (["claude", "anthropic"].includes(normalized)) return PROFILES.claude;
  if (["gemini", "google"].includes(normalized)) return PROFILES.gemini;
  return PROFILES.generic;
}
