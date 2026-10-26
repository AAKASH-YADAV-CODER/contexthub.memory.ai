import { supabase } from "@/lib/supabase/server";

export type UserPreferences = string[];

export async function getUserPreferences(
  userId: string
): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Load preferences failed: ${error.message}`);
  }

  const prefs = data?.preferences;
  if (Array.isArray(prefs)) {
    return prefs.filter((p): p is string => typeof p === "string");
  }
  return [];
}

export async function setUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<UserPreferences> {
  const cleaned = preferences
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 20);

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        preferences: cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("preferences")
    .single();

  if (error) {
    throw new Error(`Save preferences failed: ${error.message}`);
  }

  const prefs = data?.preferences;
  return Array.isArray(prefs)
    ? prefs.filter((p): p is string => typeof p === "string")
    : cleaned;
}

export function formatPreferencesForPrompt(
  preferences: UserPreferences
): string {
  if (preferences.length === 0) {
    return "No user preferences set.";
  }
  return preferences.map((p) => `- ${p}`).join("\n");
}
