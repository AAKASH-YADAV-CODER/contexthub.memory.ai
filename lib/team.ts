import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/server";

/**
 * Ensure the signed-in Clerk user has a personal team.
 * Returns { userId, teamId }.
 */
export async function requireUserTeam() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Team lookup failed: ${membershipError.message}`);
  }

  if (membership?.team_id) {
    return { userId, teamId: membership.team_id as string };
  }

  const user = await currentUser();
  const teamName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Personal team";

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name: `${teamName}'s team` })
    .select("id")
    .single();

  if (teamError || !team) {
    throw new Error(`Team create failed: ${teamError?.message}`);
  }

  const { error: linkError } = await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: userId,
    role: "owner",
  });

  if (linkError) {
    throw new Error(`Team membership failed: ${linkError.message}`);
  }

  return { userId, teamId: team.id as string };
}
