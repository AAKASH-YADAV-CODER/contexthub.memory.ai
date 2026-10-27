/**
 * Next.js instrumentation — runs once on server start.
 * Node-only OTEL setup lives in instrumentation.node.ts so Edge never loads it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (
    !process.env.LANGFUSE_PUBLIC_KEY ||
    !process.env.LANGFUSE_SECRET_KEY
  ) {
    console.warn(
      "[Langfuse] Skipping OTEL setup — LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY not set"
    );
    return;
  }

  await import("./instrumentation.node");
}
