import type { StoredMessage } from "@/lib/memory/conversations";
import type { UserPreferences } from "@/lib/memory/preferences";

export type AgentName = "research" | "summary";

export type AgentContext = {
  message: string;
  userId: string;
  teamId: string;
  runId: string;
  /** Prior turns in this conversation (short-term memory), oldest → newest */
  history: StoredMessage[];
  /** Long-lived user prefs injected into system prompts */
  preferences: UserPreferences;
};

export type AgentResult = {
  text: string;
  toolsUsed: string[];
  sources: string[];
  agent: AgentName;
};
