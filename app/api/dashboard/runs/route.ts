import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/admin";
import {
  listAgentRuns,
  type AgentType,
  type RunStatus,
} from "@/lib/observability/runs";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUserId(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const agent = (searchParams.get("agent") ?? "all") as AgentType | "all";
    const status = (searchParams.get("status") ?? "all") as RunStatus | "all";

    const runs = await listAgentRuns({ from, to, agent, status, limit: 80 });
    const totalCostUsd = runs.reduce((sum, r) => sum + r.costUsd, 0);

    return NextResponse.json({ runs, totalCostUsd, count: runs.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
