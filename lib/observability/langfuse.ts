export function isLangfuseEnabled(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY
  );
}

/** Flush pending OTEL spans to Langfuse (call via `after()` in route handlers). */
export async function flushLangfuse() {
  if (!isLangfuseEnabled()) return;
  try {
    const { langfuseSpanProcessor } = await import(
      "@/lib/observability/langfuse-processor"
    );
    await langfuseSpanProcessor.forceFlush();
  } catch (error) {
    console.error("[Langfuse] flush failed:", error);
  }
}
