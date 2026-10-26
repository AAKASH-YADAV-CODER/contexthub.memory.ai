export type AgentName = "research" | "summary";

export type AgentContext = {
  message: string;
  userId: string;
  teamId: string;
  runId: string;
};

export type AgentResult = {
  text: string;
  toolsUsed: string[];
  sources: string[];
  agent: AgentName;
};
