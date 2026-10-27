# Week 8 — Better Tracing (Langfuse)

Langfuse Cloud orgs now require **OpenTelemetry** ingestion. Use `@langfuse/tracing` + `@langfuse/otel` (not the legacy `langfuse` package).

## Day 50 — Install & sign up

```bash
npm install @langfuse/tracing @langfuse/otel \
  @opentelemetry/api@1.9.1 \
  @opentelemetry/core@2.0.1 \
  @opentelemetry/sdk-trace-base@2.0.1 \
  @opentelemetry/sdk-trace-node@2.0.1 \
  @opentelemetry/exporter-trace-otlp-http@0.203.0 \
  @opentelemetry/otlp-exporter-base@0.203.0
```

Requires **Node.js ≥ 22**. Pin OTEL to the 2.x line — Langfuse’s peer deps do not yet match OTEL JS 3.x (`@opentelemetry/sdk-trace`).

1. Create a free project at [cloud.langfuse.com](https://cloud.langfuse.com)  
2. Copy **Public key** + **Secret key**  
3. Add to `.env.local` (and Vercel env):

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

(US region: `https://us.cloud.langfuse.com`)

Restart `npm run dev` so `instrumentation.ts` registers the OTEL provider.

## Days 51–54 — What we instrumented

Every chat creates a Langfuse **trace** `contexthub-chat` (via `observe` + OTEL) with nested **generations**:

| Observation | What |
|-------------|------|
| `router` | Agent routing LLM call |
| `summary-agent` / `research-agent` | Specialist LLM + tools |
| `embed:retrieval_query` | Query embedding (when memory search runs) |

Each generation records:

- **Latency** → `metadata.latencyMs`  
- **Tokens** → usageDetails (input / output / total)  
- **Cost** → `costDetails.total` (USD estimate from `lib/observability/pricing.ts`)  

Also mirrored into Supabase `agent_traces` output JSON (`latencyMs`, `costUsd`, `usage`).

Traces are sent to `POST /api/public/otel/v1/traces` (not the old ingestion API).

## Day 52 — See traces

1. Ask a few questions in chat  
2. Open Langfuse → **Traces**  
3. Click a `contexthub-chat` run → expand router + agent generations  

## Cost notes

Prices in `lib/observability/pricing.ts` are **approximate**. Update when Google changes rates.

## Files

| Path | Role |
|------|------|
| `instrumentation.ts` | Registers OTEL provider (Node only) |
| `instrumentation.node.ts` | `NodeTracerProvider` + Langfuse processor |
| `lib/observability/langfuse-processor.ts` | `LangfuseSpanProcessor` |
| `lib/observability/langfuse.ts` | `flushLangfuse()` for serverless |
| `lib/observability/traced-llm.ts` | OTEL wrap for `generateText` / `embed` |
| `lib/observability/pricing.ts` | Token → USD |
| `app/api/chat/route.ts` | `observe` + `propagateAttributes` + `after(flush)` |
