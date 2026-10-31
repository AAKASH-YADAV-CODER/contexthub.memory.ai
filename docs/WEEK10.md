# Week 10 — Metrics Dashboard

KPIs + Recharts on `/dashboard` (admin only), above the Week 9 trace viewer.

## Install

```bash
npm install recharts
```

## Stats (Days 64–65, 68)

| KPI | Meaning |
|-----|---------|
| Runs today | Runs started today (UTC) |
| Avg latency (7d) | Mean `totalLatencyMs` / agent latency over the week |
| Cost this week | Sum of `costUsd` on traced LLM steps |
| Error rate (7d) | `%` of runs with status `fail` |
| Most used tools | Counts from `toolsUsed` on finished runs |

## Charts (Days 66–67)

- Runs per day (bar)
- Cost per day (line)
- Tool usage (horizontal bar)
- Agent mix (pie) + failed runs per day (bar)

## API

`GET /api/dashboard/metrics` — admin only; returns `DashboardMetrics`.

## Files

| Path | Role |
|------|------|
| `lib/observability/metrics.ts` | Aggregate week KPIs |
| `lib/observability/metrics-types.ts` | Shared types for client |
| `app/api/dashboard/metrics/route.ts` | Metrics API |
| `components/dashboard/MetricsPanel.tsx` | Stats + Recharts |
| `components/dashboard/DashboardClient.tsx` | Hosts metrics + traces |
