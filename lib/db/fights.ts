import { createAdminClient } from "@/lib/supabase/admin";
import type { FighterSummary } from "./fighters";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FightCategory = "main_card" | "prelim" | "early_prelim";

type FighterInFight = FighterSummary & {
  age: number | null;
  height: number | null;
  weight: number | null;
  reach: number | null;
  record: string | null;
};

export type FightParticipant = {
  corner: "fighter_1" | "fighter_2";
  fighters: FighterInFight;
};

export type FightRow = {
  id: string;
  bout_order: number;
  weight_class: string | null;
  category: string;
  status: string | null;
  winner_id: string | null;
  win_method: string | null;
  round: number | null;
  time: string | null;
  fight_participants: FightParticipant[];
};

export type UpdateFightPayload = {
  fighter1Id: string;
  fighter2Id: string;
  weightClass: string | null;
  category: FightCategory;
  boutOrder: number;
  status: string;
  winnerId: string | null;
  winMethod: string | null;
  round: number | null;
  time: string | null;
};

export type AddFightPayload = {
  eventId: string;
  fighter1Id: string;
  fighter2Id: string;
  weightClass: string | null;
  category: FightCategory;
  boutOrder: number;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all fights for an event with participants, ordered by bout_order. */
export async function getFightsForEvent(eventId: string): Promise<FightRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("fights")
    .select(
      `id, bout_order, weight_class, category, status, winner_id, win_method, round, time,
       fight_participants ( corner, fighters ( id, name, nickname, age, height, weight, reach, record ) )`
    )
    .eq("event_id", eventId)
    .order("bout_order");
  if (error) throw new Error(error.message);
  return data as unknown as FightRow[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertFight(
  payload: AddFightPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();

  const { data: fight, error: fightError } = await db
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

  const { error: participantsError } = await db
    .from("fight_participants")
    .insert([
      { fight_id: fight.id, fighter_id: payload.fighter1Id, corner: "fighter_1" },
      { fight_id: fight.id, fighter_id: payload.fighter2Id, corner: "fighter_2" },
    ]);

  if (participantsError) {
    // Rollback the fight row so the DB stays consistent
    await db.from("fights").delete().eq("id", fight.id);
    return { error: participantsError.message };
  }

  return {};
}

export async function updateFight(
  fightId: string,
  payload: UpdateFightPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();

  // Update both corners
  const { error: p1Err } = await db
    .from("fight_participants")
    .update({ fighter_id: payload.fighter1Id })
    .eq("fight_id", fightId)
    .eq("corner", "fighter_1");
  if (p1Err) return { error: p1Err.message };

  const { error: p2Err } = await db
    .from("fight_participants")
    .update({ fighter_id: payload.fighter2Id })
    .eq("fight_id", fightId)
    .eq("corner", "fighter_2");
  if (p2Err) return { error: p2Err.message };

  const { error } = await db
    .from("fights")
    .update({
      weight_class: payload.weightClass,
      category: payload.category,
      bout_order: payload.boutOrder,
      status: payload.status,
      winner_id: payload.winnerId,
      win_method: payload.winMethod,
      round: payload.round,
      time: payload.time,
    })
    .eq("id", fightId);
  if (error) return { error: error.message };

  return {};
}

export async function deleteFight(id: string): Promise<{ error?: string }> {
  const db = createAdminClient();
  // Remove participants first in case there is no CASCADE rule
  await db.from("fight_participants").delete().eq("fight_id", id);
  const { error } = await db.from("fights").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
