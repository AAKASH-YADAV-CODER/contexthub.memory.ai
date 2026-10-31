import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isAdminUserId } from "@/lib/admin";

/** Whether the current user can open /dashboard. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
  return NextResponse.json({ isAdmin: isAdminUserId(userId) });
}
