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
  fight_id: string;
  picked_fighter_id: string;
};

export type UpsertPickPayload = {
  user_id: string;
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
 * Returns all picks the current user has made for fights in this event.
 * Picks are now scoped to (user_id, fight_id) only — no league_id filter.
 */
export async function getUserPicksForEvent(
  userId: string,
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
    .select("id, user_id, fight_id, picked_fighter_id")
    .eq("user_id", userId)
    .in("fight_id", fightIds);

  if (error) throw new Error(error.message);
  return (data ?? []) as PickRow[];
}

export type LeaguePickEntry = {
  fight_id: string;
  picked_fighter_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar_url: string | null;
};

/**
 * Returns all picks for every member of a league for a given event,
 * joined with basic user profile data (name, avatar_url).
 * Scopes to league members via league_members join — no league_id on picks.
 */
export async function getLeaguePicksForEvent(
  leagueId: string,
  eventId: string
): Promise<LeaguePickEntry[]> {
  const db = createAdminClient();

  const [{ data: fightData, error: fightError }, { data: memberData, error: memberError }] =
    await Promise.all([
      db.from("fights").select("id").eq("event_id", eventId),
      db.from("league_members").select("user_id").eq("league_id", leagueId),
    ]);

  if (fightError) throw new Error(fightError.message);
  if (memberError) throw new Error(memberError.message);

  const fightIds = (fightData ?? []).map((f) => f.id);
  const memberIds = (memberData ?? []).map((m) => m.user_id);
  if (fightIds.length === 0 || memberIds.length === 0) return [];

  const { data: picks, error: picksError } = await db
    .from("picks")
    .select("fight_id, picked_fighter_id, user_id")
    .in("user_id", memberIds)
    .in("fight_id", fightIds);
  if (picksError) throw new Error(picksError.message);
  if (!picks || picks.length === 0) return [];

  const userIds = Array.from(new Set(picks.map((p) => p.user_id)));
  const { data: profiles, error: profilesError } = await db
    .from("users")
    .select("id, name, avatar_url")
    .in("id", userIds);
  if (profilesError) throw new Error(profilesError.message);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return picks.map((pick) => {
    const profile = profileMap.get(pick.user_id);
    return {
      fight_id: pick.fight_id,
      picked_fighter_id: pick.picked_fighter_id,
      user_id: pick.user_id,
      user_name: profile?.name ?? null,
      user_avatar_url: profile?.avatar_url ?? null,
    };
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Inserts or updates a pick for a given user/fight combination.
 * Unique constraint on (user_id, fight_id) in the picks table.
 */
export async function upsertPick(
  payload: UpsertPickPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("picks").upsert(
    {
      user_id: payload.user_id,
      fight_id: payload.fight_id,
      picked_fighter_id: payload.picked_fighter_id,
    },
    { onConflict: "user_id,fight_id" }
  );
  if (error) return { error: error.message };
  return {};
}
