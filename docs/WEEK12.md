# Week 12 — Replay + Deploy

## Day 78–79 — Replay + compare

On `/dashboard` → select any run → **Replay**.

- Re-runs the multi-agent pipeline with the **same user message**
- Shows **original vs new answer** side by side
- Failed runs get a highlighted Replay button (amber)

API: `POST /api/dashboard/runs/[runId]/replay`

## Day 80 — UI polish

Dashboard stacks: Metrics → Evals → Trace viewer (filters + timeline + replay).

## Day 81 — Deploy final version

1. Ensure Vercel env includes Langfuse, Clerk, Supabase, `ADMIN_USER_IDS`, `EVAL_API_SECRET`
2. Run `week11-setup.sql` on production Supabase
3. `git push` / Vercel production deploy
4. Optional: enable GitHub `EVALS_ENABLED` + secrets for post-deploy evals

## Files

| Path | Role |
|------|------|
| `lib/evals/replay.ts` | Replay + compare |
| `app/api/dashboard/runs/[runId]/replay/route.ts` | Replay API |
| `components/dashboard/ReplayCompare.tsx` | Side-by-side UI |
