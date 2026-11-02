# Week 11 — Eval Runner

Keyword-based evals for the multi-agent pipeline (AI unit tests).

## Day 71–72 — Schema + seed

Run in Supabase SQL Editor:

`supabase/week11-setup.sql`

Creates `eval_cases`, `eval_runs`, `eval_results` and seeds **10** starter questions.

## Day 73 — Runner

- `POST /api/evals/run` (admin session **or** `Authorization: Bearer $EVAL_API_SECRET`)
- For each case: `runMultiAgent` → keyword score → pass/fail
- Pass rule: all keywords match, **or** ≥ half match when there are 2+ keywords

## Day 74 — Dashboard

`/dashboard` → **Eval suite** panel → **Run evals** + pass/fail list.

## Day 75 — GitHub Action

Workflow: `.github/workflows/evals.yml`

1. Repo → Settings → Variables → `EVALS_ENABLED` = `true`
2. Secrets:
   - `EVAL_BASE_URL` — production URL
   - `EVAL_API_SECRET` — same value as in Vercel/` .env`
3. Optional: `EVAL_USER_ID` + `EVAL_TEAM_ID` on the app for CI identity

Local:

```bash
EVAL_API_SECRET=... EVAL_BASE_URL=http://localhost:3000 npm run eval
```

## Day 76 — Fourth OSS PR

Manual: open a PR on an OSS agent/eval repo (contribute docs, fixtures, or a small fix). Not automated in this codebase.

## Files

| Path | Role |
|------|------|
| `supabase/week11-setup.sql` | Tables + seed |
| `lib/evals/score.ts` | Keyword scorer |
| `lib/evals/runner.ts` | Suite runner |
| `app/api/evals/run/route.ts` | Trigger API |
| `app/api/evals/results/route.ts` | Latest results |
| `components/dashboard/EvalsPanel.tsx` | UI |
| `scripts/run-evals.mjs` | CI client |
| `.github/workflows/evals.yml` | Deploy-time evals |
