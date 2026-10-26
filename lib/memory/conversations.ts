import { supabase } from "@/lib/supabase/server";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export async function getOrCreateConversation(params: {
  conversationId?: string | null;
  userId: string;
  teamId: string;
  titleHint?: string;
}): Promise<string> {
  if (params.conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", params.conversationId)
      .eq("user_id", params.userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Conversation lookup failed: ${error.message}`);
    }
    if (data?.id) return data.id as string;
  }

  const title =
    params.titleHint?.slice(0, 80) ||
    `Chat ${new Date().toLocaleDateString()}`;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: params.userId,
      team_id: params.teamId,
      title,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Conversation create failed: ${error?.message}`);
  }

  return data.id as string;
}

export async function saveMessage(params: {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: params.conversationId,
    role: params.role,
    content: params.content,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(`Save message failed: ${error.message}`);
  }

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", params.conversationId);
}

/** Last N messages for short-term session memory (oldest → newest). */
export async function getRecentMessages(
  conversationId: string,
  limit = 10
): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Load messages failed: ${error.message}`);
  }

  return ((data ?? []) as StoredMessage[]).reverse();
}
