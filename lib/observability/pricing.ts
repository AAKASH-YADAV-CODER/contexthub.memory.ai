/**
 * Approximate USD prices per 1M tokens (update as Google pricing changes).
 * Used for Day 53 cost tracking in Langfuse metadata.
 */
export const MODEL_PRICES: Record<
  string,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  "gemini-3.8-flash": { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  "gemini-embedding-001": { inputPerMTok: 0.15, outputPerMTok: 0 },
};

export type TokenUsage = {
  input: number;
  output: number;
  total: number;
};

export function estimateCostUsd(
  modelId: string,
  usage: TokenUsage
): number {
  const prices =
    MODEL_PRICES[modelId] ??
    MODEL_PRICES["gemini-3.8-flash"];

  const inputCost = (usage.input / 1_000_000) * prices.inputPerMTok;
  const outputCost = (usage.output / 1_000_000) * prices.outputPerMTok;
  return Number((inputCost + outputCost).toFixed(8));
}
