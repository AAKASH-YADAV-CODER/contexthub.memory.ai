import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/admin";
import { replayAgentRun } from "@/lib/evals/replay";
import { requireUserTeam } from "@/lib/team";

export async function POST(
  _req: Request,
  context: { params: Promise<{ runId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUserId(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { teamId } = await requireUserTeam();
    const { runId } = await context.params;
    const compare = await replayAgentRun({ runId, userId, teamId });

    return NextResponse.json(compare);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Replay failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
