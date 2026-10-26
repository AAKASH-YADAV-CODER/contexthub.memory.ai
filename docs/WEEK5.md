# Week 5 — Multi-Agent Router

## Flow (silent)

```
User message
  → Router Agent (logged only)
  → Summary Agent  (searchMemory)  OR  Research Agent (webSearch)
  → Single reply in chat UI
```

## Files

| File | Role |
|------|------|
| `agents/router.ts` | Returns `summary` or `research` |
| `agents/summary.ts` | Internal docs / RAG |
| `agents/research.ts` | Live web via Perplexity |
| `agents/index.ts` | `runMultiAgent()` pipeline |
| `agents/tools/` | Shared tools |

## Day 32 — Routing tests

| Question | Expected agent | Expected tool |
|----------|----------------|---------------|
| Summarize our onboarding doc | summary | searchMemory |
| What's trending in AI this week? | research | webSearch |
| Find info about our API in docs | summary | searchMemory |

Check Supabase → **agent_traces**:

1. `tool_name = router`, `step = route` → `{ "agent": "summary" }` or `research`  
2. `tool_name = summary` or `research` → agent_start / agent_finish  
3. `tool_name = multi_agent` → pipeline_complete  

## Day 33

UI stays one chat. No “routed to…” banner.

## Day 34

Every run logs which agent handled the message in `agent_traces`.

## Day 35 — Next (optional)

Stub for **Action Agent** (email, Slack) — not wired yet.
