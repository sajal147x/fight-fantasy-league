"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createLeague, joinLeagueByInviteCode } from "@/lib/db/leagues";

export async function createLeagueAction(data: {
  name: string;
  scoring_ruleset_id: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Generate a short, human-readable invite code
  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const result = await createLeague(
    {
      name: data.name,
      invite_code: inviteCode,
      scoring_ruleset_id: data.scoring_ruleset_id,
    },
    user.id
  );

  if (result.error) return { error: result.error };
  revalidatePath("/dashboard");
  return {};
}

export async function joinLeagueAction(
  inviteCode: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  // Normalise to uppercase to match how codes are stored.
  const result = await joinLeagueByInviteCode(
    inviteCode.trim().toUpperCase(),
    user.id
  );

  if (result.error) return { error: result.error };
  revalidatePath("/dashboard");
  return {};
}
