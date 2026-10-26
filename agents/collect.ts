/**
 * Pull tool names + source titles/citations from AI SDK generateText steps.
 */
export function collectToolsAndSources(
  steps: Array<{
    toolCalls: Array<{ toolName: string }>;
    toolResults: Array<{ output: unknown }>;
  }>
): { toolsUsed: string[]; sources: string[] } {
  const toolsUsed: string[] = [];
  const sources: string[] = [];

  for (const step of steps) {
    for (const call of step.toolCalls) {
      if (!toolsUsed.includes(call.toolName)) {
        toolsUsed.push(call.toolName);
      }
    }

    for (const toolResult of step.toolResults) {
      const output = toolResult.output as {
        results?: Array<{ title?: string }>;
        citations?: string[];
      };

      if (Array.isArray(output?.results)) {
        for (const r of output.results) {
          if (r.title && !sources.includes(r.title)) {
            sources.push(r.title);
          }
        }
      }

      if (Array.isArray(output?.citations)) {
        for (const c of output.citations.slice(0, 3)) {
          if (!sources.includes(c)) sources.push(c);
        }
      }
    }
  }

  return { toolsUsed, sources };
}
