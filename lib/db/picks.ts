import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FighterDetails = {
  id: string;
  name: string;
  nickname: string | null;
  image_url: string | null;
  nationality: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  reach: number | null;
  record: string | null;
};

export type FightParticipantDetails = {
  corner: "fighter_1" | "fighter_2";
  odds: string | null;
  fighters: FighterDetails;
};

export type FightWithDetails = {
  id: string;
  bout_order: number;
  weight_class: string | null;
  category: string;
  status: string | null;
  winner_id: string | null;
  win_method: string | null;
  round: number | null;
  time: string | null;
  fight_participants: FightParticipantDetails[];
};

export type PickRow = {
  id: string;
  user_id: string;
  league_id: string;
  fight_id: string;
  picked_fighter_id: string;
};

export type UpsertPickPayload = {
  user_id: string;
  league_id: string;
  fight_id: string;
  picked_fighter_id: string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all fights for an event with full fighter details (including image_url)
 * and odds from fight_participants. Ordered by bout_order descending so the
 * main event appears first.
 */
export async function getEventFightsWithParticipants(
  eventId: string
): Promise<FightWithDetails[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("fights")
    .select(
      `id, bout_order, weight_class, category, status, winner_id, win_method, round, time,
       fight_participants ( corner, odds, fighters ( id, name, nickname, image_url, nationality, age, height, weight, reach, record ) )`
    )
    .eq("event_id", eventId)
    .order("bout_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data as unknown as FightWithDetails[];
}

/**
 * Returns all picks the current user has made for fights in this event,
 * filtered by league_id so picks are scoped per-league.
 */
export async function getUserPicksForEvent(
  userId: string,
  leagueId: string,
  eventId: string
): Promise<PickRow[]> {
  const db = createAdminClient();

  // Resolve fight IDs for this event first
  const { data: fightData, error: fightError } = await db
    .from("fights")
    .select("id")
    .eq("event_id", eventId);

  if (fightError) throw new Error(fightError.message);
  const fightIds = (fightData ?? []).map((f) => f.id);
  if (fightIds.length === 0) return [];

  const { data, error } = await db
    .from("picks")
    .select("id, user_id, league_id, fight_id, picked_fighter_id")
    .eq("user_id", userId)
    .eq("league_id", leagueId)
    .in("fight_id", fightIds);

  if (error) throw new Error(error.message);
  return (data ?? []) as PickRow[];
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Inserts or updates a pick for a given user/league/fight combination.
 * Requires a unique constraint on (user_id, league_id, fight_id) in the picks table.
 */
export async function upsertPick(
  payload: UpsertPickPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("picks").upsert(
    {
      user_id: payload.user_id,
      league_id: payload.league_id,
      fight_id: payload.fight_id,
      picked_fighter_id: payload.picked_fighter_id,
    },
    { onConflict: "user_id,league_id,fight_id" }
  );
  if (error) return { error: error.message };
  return {};
}
