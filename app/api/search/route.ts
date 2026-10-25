import { NextResponse } from "next/server";
import { searchSimilarChunks } from "@/lib/search";

/** Quick test endpoint for Day 11: POST { "query": "..." } */
export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    const results = await searchSimilarChunks(query, 5);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    );
  }
}
