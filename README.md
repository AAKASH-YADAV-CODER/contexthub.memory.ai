# ContextHub

AI team knowledge assistant: upload docs → agent tools (memory + web) → Gemini answers with traces.

## Architecture

```
Signed-in user (Clerk)
    → personal team (auto-created)
    → Upload docs (team-scoped) → chunk → Gemini embed → Supabase pgvector

Chat question
    → Agent (Gemini) chooses tools:
         • searchMemory  → team docs
         • webSearch     → Perplexity
    → Answer + sources + tools used
    → agent_traces rows in Supabase
```

## Stack

- Next.js 16 + Clerk auth
- Gemini chat + embeddings
- Perplexity Sonar (web search tool)
- Supabase Postgres + pgvector

## Setup

### 1. Environment

Copy `.env.example` → `.env.local` and fill keys:

```env
GOOGLE_GENERATIVE_AI_API_KEY=
PERPLEXITY_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

### 2. Supabase SQL (run both if starting fresh)

1. `supabase/rag-setup.sql` (Week 2 — chunks + match_documents)
2. `supabase/week3-setup.sql` (Week 3 — teams, traces, team-scoped search)

### 3. Clerk

1. Create app at [clerk.com](https://clerk.com)
2. Add keys to `.env.local`
3. In Clerk dashboard → Paths: sign-in `/sign-in`, sign-up `/sign-up`

### 4. Run

```bash
npm install
npm run dev
```

## Demo flow (Week 3)

1. Sign in
2. Upload a company policy (file drop or paste)
3. Ask: “What’s the vacation policy?” → should use **searchMemory**
4. Ask: “What’s happening in AI news today?” → should use **webSearch**
5. Check Supabase **agent_traces** for tool calls
6. (Optional) Sign in as another user — they get a different team and won’t see your docs

## Key files

| Path | Purpose |
|------|---------|
| `agents/tools/searchMemory.ts` | RAG tool |
| `agents/tools/webSearch.ts` | Perplexity tool |
| `lib/observability/traces.ts` | Write agent_traces |
| `lib/team.ts` | Auto personal team |
| `proxy.ts` | Clerk protect routes (Next.js 16) |
| `app/api/chat/route.ts` | Tool-calling agent |

## Week checkpoints

- [x] Week 2 — RAG pipeline
- [x] Week 3 — Tools + auth + traces + teams
