import { supabase } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const GET = async () => {
  const { data, error } = await supabase
    .from("documents")
    .select("id, title, source, created_at")
    .limit(5);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    connected: true,
    documents: data,
    documentCount: data?.length ?? 0,
  });
};
