import { NextResponse } from "next/server";
import { listConversations } from "@/lib/memory/conversations";
import { requireUserTeam } from "@/lib/team";

/** List the current user's past chat sessions (newest first). */
export async function GET() {
  try {
    const { userId } = await requireUserTeam();
    const conversations = await listConversations(userId, 40);
    return NextResponse.json({ conversations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list conversations";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
