import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/server";
import { requireUserTeam } from "@/lib/team";

/** Fetch all chunks for a document title and stitch them in order. */
export async function GET(req: Request) {
  try {
    const { teamId } = await requireUserTeam();
    const title = new URL(req.url).searchParams.get("title")?.trim() ?? "";

    if (!title) {
      return NextResponse.json(
        { error: "title query param is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .select("id, title, content, chunk_index, source, created_at")
      .eq("team_id", teamId)
      .eq("title", title)
      .order("chunk_index", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const content = data
      .map((row) => (typeof row.content === "string" ? row.content : ""))
      .join("\n\n");

    const newest = data.reduce((a, b) =>
      new Date(a.created_at).getTime() >= new Date(b.created_at).getTime()
        ? a
        : b
    );

    return NextResponse.json({
      title: data[0].title,
      source: data[0].source,
      chunkCount: data.length,
      createdAt: newest.created_at,
      content,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load document";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
