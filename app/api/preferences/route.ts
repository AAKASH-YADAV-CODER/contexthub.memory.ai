import { NextResponse } from "next/server";
import {
  getUserPreferences,
  setUserPreferences,
} from "@/lib/memory/preferences";
import { requireUserTeam } from "@/lib/team";

export async function GET() {
  try {
    const { userId } = await requireUserTeam();
    const preferences = await getUserPreferences(userId);
    return NextResponse.json({ preferences });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load preferences";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Body: { preferences: string[] } */
export async function PUT(req: Request) {
  try {
    const { userId } = await requireUserTeam();
    const body = await req.json();
    const preferences = Array.isArray(body.preferences)
      ? body.preferences.filter((p: unknown) => typeof p === "string")
      : null;

    if (!preferences) {
      return NextResponse.json(
        { error: "preferences must be a string array" },
        { status: 400 }
      );
    }

    const saved = await setUserPreferences(userId, preferences);
    return NextResponse.json({ preferences: saved });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save preferences";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
