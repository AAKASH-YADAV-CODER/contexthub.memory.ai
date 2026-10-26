# ContextHub

**ContextHub** is a team knowledge agent: upload docs (PDF/DOCX/Markdown), store them as embeddings in Supabase, and chat with an AI that can search your memory **or** the live web. Every tool call is traced. Auth and team scoping keep each user’s docs private.

> Upload → chunk → embed → ask → agent picks `searchMemory` or `webSearch` → answer with sources.

---

## Brand

App logo: [`public/logo.jpg`](./public/logo.jpg) (used in header, chat, auth, and favicon).

## Screenshot

Add a screenshot of the chat UI here after deploy:

```text
docs/screenshot-chat.png
```

*(Open the app → ask a question → capture the page → drop the image into `docs/` and replace this note.)*

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Clerk auth │────▶│  Next.js app     │────▶│  Gemini (LLM)   │
└─────────────┘     │  /chat  /upload  │     └────────┬────────┘
                    └────────┬─────────┘              │
                             │                   tool calls
                             ▼                        │
                    ┌────────────────┐       ┌────────▼────────┐
                    │ Supabase       │◀──────│ searchMemory    │
                    │ pgvector docs  │       │ webSearch       │
                    │ agent_traces   │       │ (Perplexity)    │
                    │ teams          │       └─────────────────┘
                    └────────────────┘
```

**Flow**

1. User signs in (Clerk) → personal team is created  
2. Upload file → extract text → chunk → Gemini embeddings → `documents`  
3. Chat → Gemini chooses tools → memory and/or web → answer + sources  
4. Tool calls logged to `agent_traces`

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Auth | Clerk |
| Agent | Vercel AI SDK + Gemini |
| Embeddings | Gemini `gemini-embedding-001` (768-d) |
| Web search | Perplexity Sonar |
| Database | Supabase (Postgres + pgvector) |
| Deploy | Vercel |

---

## How to run locally

### 1. Clone & install

```bash
git clone https://github.com/AAKASH-YADAV-CODER/contexthub.memory.ai.git
cd contexthub.memory.ai
npm install
```

### 2. Environment

Copy `.env.example` → `.env.local` and fill:

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

### 3. Supabase SQL

In Supabase → **SQL Editor**, run in order:

1. [`supabase/rag-setup.sql`](./supabase/rag-setup.sql)  
2. [`supabase/week3-setup.sql`](./supabase/week3-setup.sql)

### 4. Start

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign in → upload a doc → chat.

---

## Deploy to Vercel (Week 4)

1. Push this repo to GitHub (already: `AAKASH-YADAV-CODER/contexthub.memory.ai`)  
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo  
3. Add the same env vars as `.env.local`  
4. Deploy  
5. In **Clerk** dashboard → add your Vercel URL to allowed origins / redirect URLs  
6. Retest sign-in, upload, and chat on the live URL  

See [`docs/WEEK4.md`](./docs/WEEK4.md) for LinkedIn post draft + first OSS PR tips.

---

## Project map

| Path | Purpose |
|------|---------|
| `app/api/chat` | Tool-calling agent |
| `app/api/documents` | Chunk + embed + save |
| `agents/tools/` | `searchMemory`, `webSearch` |
| `lib/search.ts` | Team-scoped vector search |
| `lib/team.ts` | Auto personal team |
| `proxy.ts` | Clerk route protection (Next.js 16) |

---

## Month 1 checkpoint

- [x] Chat + Gemini  
- [x] RAG memory (upload, chunk, embed, search)  
- [x] Tools (`searchMemory` + `webSearch`)  
- [x] Auth (Clerk) + teams  
- [x] Observability (`agent_traces`)  
- [ ] Live Vercel URL (Day 23 — your deploy)  
- [ ] First OSS PR (Day 26)  
- [ ] LinkedIn post (Day 27)  

---

## License

Private / educational for now. Add an MIT license when you open-source.
