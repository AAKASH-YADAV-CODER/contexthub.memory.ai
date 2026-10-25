import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "@/lib/agent/system-prompt";
import { searchSimilarChunks } from "@/lib/search";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // 1) Retrieve relevant chunks from your docs
    const chunks = await searchSimilarChunks(message, 5);

    // 2) Build RAG context
    const context =
      chunks.length > 0
        ? chunks
            .map(
              (c, i) =>
                `[Source ${i + 1}: ${c.title} (chunk ${c.chunk_index})]\n${c.content}`
            )
            .join("\n\n---\n\n")
        : "No matching documents found in the knowledge base.";

    const prompt = `Use this context to answer the question. Prefer the context over general knowledge. If the context does not contain the answer, say you don't know based on the uploaded documents.

Context:
${context}

Question: ${message}`;

    // 3) Generate answer with Gemini
    const { text } = await generateText({
      model: google("gemini-3.8-flash"),
      system: SYSTEM_PROMPT,
      prompt,
    });

    // Unique titles for UI "Sources"
    const sources = [...new Set(chunks.map((c) => c.title))];

    return NextResponse.json({
      reply: text,
      sources,
      chunksUsed: chunks.map((c) => ({
        title: c.title,
        chunk_index: c.chunk_index,
        distance: c.distance,
      })),
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get a reply from Gemini",
      },
      { status: 500 }
    );
  }
}
