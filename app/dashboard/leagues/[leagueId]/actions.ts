"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMembershipForUser, getLeagueLeaderboard, updateLeagueImage } from "@/lib/db/leagues";
import type { LeaderboardEntry } from "@/lib/db/leagues";
import { addEventToLeague } from "@/lib/db/league-events";

export async function fetchLeaderboard(
  leagueId: string,
  eventId: string | null
): Promise<LeaderboardEntry[]> {
  return getLeagueLeaderboard(leagueId, eventId ?? undefined);
}

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

export async function updateLeagueImageAction(
  leagueId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const membership = await getMembershipForUser(leagueId, user.id);
  if (!membership) return { error: "League not found." };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided." };

  const result = await updateLeagueImage(leagueId, file);
  if ("error" in result) return { error: result.error };

  revalidatePath(`/dashboard/leagues/${leagueId}`);
  return { url: result.url };
}
