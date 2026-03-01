import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow } from "./events";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeagueEventSummary = {
  id: string;
  name: string;
  date: string | null;
  status: string;
};

export type LeagueEventRow = {
  id: string;
  league_id: string;
  event_id: string;
  added_at: string;
  events: EventRow;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns a lightweight summary of all events linked to a league,
 * ordered by date ascending. Used for filter pills on the leaderboard.
 */
export async function getLeagueEvents(
  leagueId: string
): Promise<LeagueEventSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("league_events")
    .select("events ( id, name, date, status )")
    .eq("league_id", leagueId)
    .order("events(date)", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => r.events as unknown as LeagueEventSummary)
    .filter(Boolean);
}

/** Returns all events linked to a league with full event details. */
export async function getEventsForLeague(
  leagueId: string
): Promise<LeagueEventRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("league_events")
    .select(
      `id, league_id, event_id, added_at,
       events ( id, name, type, date, venue, location, status, image_url )`
    )
    .eq("league_id", leagueId)
    .order("events(date)", { ascending: true });
  if (error) throw new Error(error.message);
  return data as unknown as LeagueEventRow[];
}

/**
 * Returns upcoming and live events that have not yet been added to the league.
 * Useful for populating an "add event" picker.
 */
export async function getAvailableEvents(
  leagueId: string
): Promise<EventRow[]> {
  const db = createAdminClient();

  // Collect event ids already linked to this league.
  const { data: linked, error: linkedError } = await db
    .from("league_events")
    .select("event_id")
    .eq("league_id", leagueId);

  if (linkedError) throw new Error(linkedError.message);

  const linkedIds = (linked ?? []).map((r) => r.event_id);

  let query = db
    .from("events")
    .select("id, name, type, date, venue, location, status, image_url")
    .in("status", ["upcoming", "live"])
    .order("date", { ascending: true });

  if (linkedIds.length > 0) {
    query = query.not("id", "in", `(${linkedIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Links an event to a league. */
export async function addEventToLeague(
  leagueId: string,
  eventId: string
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db
    .from("league_events")
    .insert({ league_id: leagueId, event_id: eventId });
  if (error) return { error: error.message };
  return {};
}
