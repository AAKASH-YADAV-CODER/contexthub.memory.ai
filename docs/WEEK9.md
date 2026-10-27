# Week 9 — Trace Viewer UI

In-app observability dashboard (Sazabi-style) over Supabase `agent_traces`.

## Setup

1. Optional lock-down — add your Clerk user id to `.env.local`:

```env
ADMIN_USER_IDS=user_xxxxxxxx
```

If unset, any signed-in user can open `/dashboard` (banner warns you).

2. Open **http://localhost:3000/dashboard** (nav: Dashboard).

## What you get

| Day | Feature |
|-----|---------|
| 57 | `/dashboard` page, admin gate |
| 58 | List agent runs (grouped by `run_id`) |
| 59–60 | Click a run → visual timeline cards |
| 61 | Filter by date, agent (`summary` / `research`), status |
| 62 | Cost per run + filtered total |

### Timeline examples

```
[10:01:01] User asked: "What's our policy?"
[10:01:02] Router picked: summary agent
[10:01:03] Tool called: searchMemory — Found 3 chunks
[10:01:06] LLM responded (summary) — 1.20s · $0.00012
[10:01:06] Run finished
```

## APIs

- `GET /api/dashboard/runs?from=&to=&agent=&status=`
- `GET /api/dashboard/runs/[runId]`

## Files

| Path | Role |
|------|------|
| `app/dashboard/page.tsx` | Admin page shell |
| `components/dashboard/DashboardClient.tsx` | Filters + run list + cost |
| `components/dashboard/RunTimeline.tsx` | Step cards |
| `lib/observability/runs.ts` | Aggregate `agent_traces` → runs/timeline |
| `lib/admin.ts` | `ADMIN_USER_IDS` gate |
