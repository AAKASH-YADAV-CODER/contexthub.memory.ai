import { embed, generateText } from "ai";
import { startActiveObservation } from "@langfuse/tracing";
import {
  estimateCostUsd,
  type TokenUsage,
} from "@/lib/observability/pricing";
import { isLangfuseEnabled } from "@/lib/observability/langfuse";

type GenerateArgs = Parameters<typeof generateText>[0];
type EmbedArgs = Parameters<typeof embed>[0];

export type TracedLlmMeta = {
  latencyMs: number;
  usage: TokenUsage;
  costUsd: number;
};

function withTelemetry(args: GenerateArgs, functionId: string): GenerateArgs {
  return {
    ...args,
    experimental_telemetry: {
      isEnabled: isLangfuseEnabled(),
      functionId,
    },
  };
}

/**
 * Wrap generateText with Langfuse OTEL generation + latency + cost.
 */
export async function tracedGenerateText(options: {
  name: string;
  modelId: string;
  args: GenerateArgs;
}): Promise<
  { result: Awaited<ReturnType<typeof generateText>> } & TracedLlmMeta
> {
  const started = Date.now();
  const inputPayload =
    "messages" in options.args && options.args.messages
      ? options.args.messages
      : "prompt" in options.args
        ? options.args.prompt
        : undefined;

  return startActiveObservation(
    options.name,
    async (observation) => {
      observation.update({
        model: options.modelId,
        input: inputPayload,
      });

      try {
        const result = await generateText(
          withTelemetry(options.args, options.name)
        );
        const latencyMs = Date.now() - started;

        const usage: TokenUsage = {
          input: result.usage?.inputTokens ?? 0,
          output: result.usage?.outputTokens ?? 0,
          total: result.usage?.totalTokens ?? 0,
        };
        const costUsd = estimateCostUsd(options.modelId, usage);

        observation.update({
          output: result.text,
          usageDetails: {
            input: usage.input,
            output: usage.output,
            total: usage.total,
          },
          costDetails: { total: costUsd },
          metadata: {
            latencyMs,
            costUsd,
            finishReason: result.finishReason,
            stepCount: result.steps?.length ?? 1,
            modelId: options.modelId,
          },
        });

        return { result, latencyMs, usage, costUsd };
      } catch (error) {
        observation.update({
          level: "ERROR",
          statusMessage:
            error instanceof Error ? error.message : "generateText failed",
          metadata: { latencyMs: Date.now() - started },
        });
        throw error;
      }
    },
    { asType: "generation" }
  );
}

/**
 * Wrap embed() with Langfuse OTEL embedding observation + latency + cost.
 */
export async function tracedEmbed(options: {
  name: string;
  modelId: string;
  args: EmbedArgs;
  textLength?: number;
}): Promise<{ result: Awaited<ReturnType<typeof embed>> } & TracedLlmMeta> {
  const started = Date.now();

  return startActiveObservation(
    options.name,
    async (observation) => {
      observation.update({
        model: options.modelId,
        input: {
          valuePreview:
            typeof options.args.value === "string"
              ? options.args.value.slice(0, 200)
              : "[embedding input]",
          textLength: options.textLength,
        },
      });

      try {
        const result = await embed({
          ...options.args,
          experimental_telemetry: {
            isEnabled: isLangfuseEnabled(),
            functionId: options.name,
          },
        });
        const latencyMs = Date.now() - started;

        const usage: TokenUsage = {
          input: result.usage?.tokens ?? 0,
          output: 0,
          total: result.usage?.tokens ?? 0,
        };
        const costUsd = estimateCostUsd(options.modelId, usage);

        observation.update({
          output: { dimensions: result.embedding.length },
          usageDetails: {
            input: usage.input,
            output: 0,
            total: usage.total,
          },
          costDetails: { total: costUsd },
          metadata: { latencyMs, costUsd, modelId: options.modelId },
        });

        return { result, latencyMs, usage, costUsd };
      } catch (error) {
        observation.update({
          level: "ERROR",
          statusMessage:
            error instanceof Error ? error.message : "embed failed",
          metadata: { latencyMs: Date.now() - started },
        });
        throw error;
      }
    },
    { asType: "embedding" }
  );
}
