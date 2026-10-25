# ContextHub

AI team knowledge assistant: upload docs → retrieve relevant chunks → answer with Gemini (RAG).

## Architecture

```
Upload text
    → Chunk (lib/chunker.ts)
    → Embed with Gemini (lib/embeddings.ts)
    → Store in Supabase pgvector (documents)

User question
    → Embed query
    → Similarity search (match_documents)
    → Build prompt with top chunks
    → Gemini answer + sources in UI
```

## Stack

- **Next.js 16** — app + API routes
- **Gemini** — chat (`gemini-3.8-flash`) + embeddings (`gemini-embedding-001`, 768-d)
- **Supabase** — Postgres + pgvector
- **Perplexity** — reserved for later (web search tool)

## Setup

1. Copy env vars into `.env.local`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=
PERPLEXITY_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

2. In Supabase SQL Editor, run [`supabase/rag-setup.sql`](./supabase/rag-setup.sql)  
   (adds `chunk_index` + `match_documents` RPC).

3. Install & run:

```bash
npm install
npm run dev
```

## Demo flow (Week 2)

1. Open [http://localhost:3000/upload](http://localhost:3000/upload)
2. Paste a “Company Policy” doc (vacation, refunds, etc.) → **Save**
3. Open chat → ask “What’s the vacation policy?”
4. Confirm the answer uses your doc and shows **Sources**

## Key routes

| Route | Purpose |
|-------|---------|
| `/` | Chat UI with RAG |
| `/upload` | Paste & save documents |
| `POST /api/documents` | Chunk + embed + insert |
| `POST /api/search` | Test similarity search |
| `POST /api/chat` | Retrieve → prompt → Gemini |

## Week 2 checkpoint

- [x] Document upload
- [x] Chunking
- [x] Embeddings (Gemini, not OpenAI)
- [x] Vector search
- [x] RAG chat
- [x] Sources in UI
