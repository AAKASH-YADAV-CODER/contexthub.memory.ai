import { LangfuseSpanProcessor } from "@langfuse/otel";

/** Shared processor — flush from route handlers via `after()`. */
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  exportMode: "immediate",
});
