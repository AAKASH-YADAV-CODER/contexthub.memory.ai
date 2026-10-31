import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/admin";
import { getDashboardMetrics } from "@/lib/observability/metrics";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isAdminUserId(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const metrics = await getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
