import type { StoredMessage } from "@/lib/memory/conversations";
import {
  formatPreferencesForPrompt,
  type UserPreferences,
} from "@/lib/memory/preferences";

export function withPreferences(
  baseSystem: string,
  preferences: UserPreferences
): string {
  return `${baseSystem}

User preferences (follow these when responding):
${formatPreferencesForPrompt(preferences)}`;
}

/** Build AI SDK messages: prior history + current user turn. */
export function buildChatMessages(
  history: StoredMessage[],
  currentUserMessage: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const prior = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  return [...prior, { role: "user", content: currentUserMessage }];
}
