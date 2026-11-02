import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/admin";
import { runEvalSuite } from "@/lib/evals/runner";
import { requireUserTeam } from "@/lib/team";

/**
 * POST /api/evals/run
 * - Browser (admin): Clerk session
 * - CI: Authorization: Bearer $EVAL_API_SECRET
 */
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const evalSecret = process.env.EVAL_API_SECRET?.trim();
    const isCi =
      Boolean(evalSecret) && authHeader === `Bearer ${evalSecret}`;

    let trigger: "manual" | "ci" = "manual";
    let userId: string | undefined;
    let teamId: string | undefined;

    if (isCi) {
      trigger = "ci";
    } else {
      const session = await auth();
      if (!session.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!isAdminUserId(session.userId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const team = await requireUserTeam();
      userId = team.userId;
      teamId = team.teamId;
    }

    const suite = await runEvalSuite({ trigger, userId, teamId });

    return NextResponse.json({
      ok: suite.failed === 0,
      ...suite,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Eval suite failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
