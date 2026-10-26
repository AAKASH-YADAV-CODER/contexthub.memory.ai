# Week 7 — Session Memory

Slack ingestion skipped. This week adds **short-term chat memory** + **user preferences**.

## Concepts

| Memory | What | Where |
|--------|------|--------|
| Short-term | This chat session (last 10 messages) | `conversations` + `messages` |
| Long-term | Uploaded docs (RAG) | `documents` + embeddings |
| Preferences | “Prefers short answers”, team focus, etc. | `user_preferences` |

## Setup

Run in Supabase SQL Editor:

`supabase/week7-setup.sql`

## Flow

1. Client sends `{ message, conversationId? }`  
2. Server loads last 10 messages + user preferences  
3. Saves user message  
4. Router → Summary/Research (with history + prefs in prompt)  
5. Saves assistant message  
6. Returns reply + `conversationId`

## Test

1. Ask: “My name is Aakash”  
2. Ask: “What’s my name?” → should remember  
3. Open **Preferences** → enable “User prefers short answers”  
4. Ask a long topic → answer should be shorter  

## APIs

| Route | Purpose |
|-------|---------|
| `POST /api/chat` | Chat + persist session |
| `GET /api/conversations/[id]/messages` | Restore history |
| `GET/PUT /api/preferences` | Read/write prefs |
