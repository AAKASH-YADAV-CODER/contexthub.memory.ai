import { NextResponse } from "next/server";
import { chunkText } from "@/lib/chunker";
import { createEmbedding } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase/server";
import { requireUserTeam } from "@/lib/team";

/** List recent document chunks for the user's team */
export async function GET() {
  try {
    const { teamId } = await requireUserTeam();

    const { data, error } = await supabase
      .from("documents")
      .select("id, title, chunk_index, source, created_at, team_id")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ documents: data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list documents";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Upload a document for the user's team:
 * 1) chunk text
 * 2) embed each chunk (Gemini)
 * 3) insert rows into documents
 */
export async function POST(req: Request) {
  try {
    const { teamId } = await requireUserTeam();
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim()
        : title;

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
        source,
        embedding,
        team_id: teamId,
      });
    }

    const { data, error } = await supabase
      .from("documents")
      .insert(rows)
      .select("id, title, chunk_index, team_id");

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
    const message =
      error instanceof Error ? error.message : "Failed to save document";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
