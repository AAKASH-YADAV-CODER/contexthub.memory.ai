# Week 4 — Polish, deploy, share

## Day 22 — UI polish ✅ (in app)

- Chat bubbles + avatars + suggestion chips  
- Upload drag-and-drop + “No documents yet” empty state  
- Shared header nav (Chat / Upload)

## Day 23 — Deploy to Vercel (you)

1. Commit & push current branch (or merge to `main`):

```bash
git add .
git commit -m "feat: polish UI and docs for Month 1"
git push -u origin HEAD
```

2. Go to [vercel.com/new](https://vercel.com/new) → import `contexthub.memory.ai`  
3. Environment variables (Production + Preview):

| Name | From |
|------|------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI Studio |
| `PERPLEXITY_API_KEY` | Perplexity |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk |
| `CLERK_SECRET_KEY` | Clerk |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |

4. Deploy → copy the live URL  
5. Clerk → **Configure** → add Vercel domain to:
   - Allowed origins  
   - Sign-in / Sign-up redirect URLs  

## Day 24 — Fix live bugs (checklist)

- [ ] `/` redirects to sign-in when logged out  
- [ ] Sign-in works on production domain  
- [ ] Upload PDF → redirects to chat  
- [ ] Chat answers from docs (`searchMemory`)  
- [ ] Chat answers news (`webSearch`)  
- [ ] Rows appear in Supabase `agent_traces`  

Common fixes:

- Missing env var → redeploy after adding  
- Clerk “redirect invalid” → add production URL in Clerk  
- Vector search fails → confirm `week3-setup.sql` ran  

## Day 25 — README ✅

See root `README.md`.

Add a screenshot: put `docs/screenshot-chat.png` and link it in the README.

## Day 26 — First OSS contribution (you)

Pick **one** beginner-friendly issue:

1. [firsttimersonly.com](https://www.firsttimersonly.com/)  
2. Or search GitHub: `label:good-first-issue language:TypeScript`  
3. Or contribute docs typo / README fix to a small AI/Next.js project  

Steps:

1. Fork → clone → branch `fix/typo-readme`  
2. Make a tiny change  
3. Open PR with a clear title + 2–3 sentence description  
4. Be polite in review comments  

Done when: PR is opened (merged is a bonus).

## Day 27 — LinkedIn post (copy & personalize)

```text
I built ContextHub — a RAG-powered team knowledge agent — in 4 weeks.

What it does:
• Upload docs (PDF/DOCX/MD) → chunk + embed into Supabase
• Chat agent (Gemini) that chooses tools:
  – searchMemory for your docs
  – webSearch (Perplexity) for live info
• Clerk auth + team-scoped data
• Tool-call traces for observability

What I learned:
1. RAG beats “just prompt the LLM” for private knowledge
2. Tool calling turns a chatbot into an agent
3. Observability (logging every tool call) saves hours of debugging
4. Ship weekly — polish and deploy beat perfect local demos

Repo: https://github.com/AAKASH-YADAV-CODER/contexthub.memory.ai
Live: [paste your Vercel URL]

#buildinpublic #AI #RAG #NextJS #Supabase
```

## Day 28 — Rest

Month 1 done when you have: live URL + README + (optional) first OSS PR + LinkedIn post.
