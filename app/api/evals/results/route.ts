import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/admin";
import {
  getLatestEvalRun,
  listRecentEvalRuns,
} from "@/lib/evals/runner";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUserId(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [latest, history] = await Promise.all([
      getLatestEvalRun(),
      listRecentEvalRuns(8),
    ]);

    return NextResponse.json({ latest, history });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load eval results";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
