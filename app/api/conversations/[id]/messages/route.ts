import { NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/memory/conversations";
import { supabase } from "@/lib/supabase/server";
import { requireUserTeam } from "@/lib/team";

/** Load recent messages for a conversation owned by the user. */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireUserTeam();
    const { id } = await context.params;

    const { data: convo, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!convo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const messages = await getRecentMessages(id, 50);
    return NextResponse.json({ messages });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load messages";
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
