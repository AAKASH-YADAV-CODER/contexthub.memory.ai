import { NextResponse } from "next/server";
import { chunkText } from "@/lib/chunker";
import { createEmbedding } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase/server";

/** List recent document chunks */
export async function GET() {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, chunk_index, source, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ documents: data });
}

/**
 * Upload a document:
 * 1) chunk text
 * 2) embed each chunk (Gemini)
 * 3) insert rows into documents
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!title || !content) {
      return NextResponse.json(
        { error: "title and content are required" },
        { status: 400 }
      );
    }

    const chunks = chunkText(content, 500);
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: "content produced no chunks" },
        { status: 400 }
      );
    }

    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await createEmbedding(chunks[i], "RETRIEVAL_DOCUMENT");
      rows.push({
        title,
        content: chunks[i],
        chunk_index: i,
        source: title,
        embedding,
      });
    }

    const { data, error } = await supabase
      .from("documents")
      .insert(rows)
      .select("id, title, chunk_index");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      title,
      chunkCount: data?.length ?? 0,
      chunks: data,
    });
  } catch (error) {
    console.error("Documents POST error:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}
