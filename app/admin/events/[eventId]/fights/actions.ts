"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type FightCategory = "main_card" | "prelim" | "early_prelim";

export type AddFightPayload = {
  eventId: string;
  fighter1Id: string;
  fighter2Id: string;
  weightClass: string | null;
  category: FightCategory;
  boutOrder: number;
};

export async function addFight(payload: AddFightPayload) {
  const supabase = createAdminClient();

  // Insert the fight row first
  const { data: fight, error: fightError } = await supabase
    .from("fights")
    .insert({
      event_id: payload.eventId,
      weight_class: payload.weightClass,
      category: payload.category,
      bout_order: payload.boutOrder,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (fightError) return { error: fightError.message };

  // Insert both participants
  const { error: participantsError } = await supabase
    .from("fight_participants")
    .insert([
      { fight_id: fight.id, fighter_id: payload.fighter1Id, corner: "fighter_1" },
      { fight_id: fight.id, fighter_id: payload.fighter2Id, corner: "fighter_2" },
    ]);

  if (participantsError) {
    // Rollback the fight row so the DB stays consistent
    await supabase.from("fights").delete().eq("id", fight.id);
    return { error: participantsError.message };
  }

  revalidatePath(`/admin/events/${payload.eventId}/fights`);
  return {};
}

export async function deleteFight(fightId: string, eventId: string) {
  const supabase = createAdminClient();

  // Remove participants first in case there is no CASCADE rule
  await supabase.from("fight_participants").delete().eq("fight_id", fightId);

  const { error } = await supabase.from("fights").delete().eq("id", fightId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/events/${eventId}/fights`);
  return {};
}
