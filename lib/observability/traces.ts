import { supabase } from "@/lib/supabase/server";

type TraceInput = {
  runId: string;
  step: string;
  toolName: string;
  input: unknown;
  output: unknown;
  userId?: string;
  teamId?: string;
};

export async function logAgentTrace(entry: TraceInput) {
  const { error } = await supabase.from("agent_traces").insert({
    run_id: entry.runId,
    step: entry.step,
    tool_name: entry.toolName,
    input: entry.input,
    output: entry.output,
    user_id: entry.userId ?? null,
    team_id: entry.teamId ?? null,
  });

  if (error) {
    console.error("Failed to log agent trace:", error.message);
  }
}
