"use server";

import { createClient } from "@/lib/supabase/server";
import { upsertPick } from "@/lib/db/picks";

export async function savePick(
  leagueId: string,
  fightId: string,
  pickedFighterId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  return upsertPick({
    user_id: user.id,
    league_id: leagueId,
    fight_id: fightId,
    picked_fighter_id: pickedFighterId,
  });
}
