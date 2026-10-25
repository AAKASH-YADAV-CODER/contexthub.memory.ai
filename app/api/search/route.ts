import { NextResponse } from "next/server";
import { searchSimilarChunks } from "@/lib/search";
import { requireUserTeam } from "@/lib/team";

/** Quick test endpoint: POST { "query": "..." } — team-scoped */
export async function POST(req: Request) {
  try {
    const { teamId } = await requireUserTeam();
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    const results = await searchSimilarChunks(query, 5, teamId);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    const message =
      error instanceof Error ? error.message : "Search failed";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
