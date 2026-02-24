"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMembershipForUser } from "@/lib/db/leagues";
import { addEventToLeague } from "@/lib/db/league-events";

export async function addEventToLeagueAction(
  leagueId: string,
  eventId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Only owners may add events to a league.
  const membership = await getMembershipForUser(leagueId, user.id);

  if (!membership) return { error: "League not found." };
  if (membership.role !== "owner")
    return { error: "Only league owners can add events." };

  const result = await addEventToLeague(leagueId, eventId);
  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/leagues/${leagueId}`);
  return {};
}
