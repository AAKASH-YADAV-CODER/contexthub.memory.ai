import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { langfuseSpanProcessor } from "@/lib/observability/langfuse-processor";

const tracerProvider = new NodeTracerProvider({
  spanProcessors: [langfuseSpanProcessor],
});

tracerProvider.register();
