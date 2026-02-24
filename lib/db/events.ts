import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventStatus = "upcoming" | "live" | "completed";

export type EventRow = {
  id: string;
  name: string;
  type: string | null;
  date: string | null;
  venue: string | null;
  location: string | null;
  status: EventStatus;
};

export type EventPayload = {
  name: string;
  type: string | null;
  date: string | null;
  venue: string | null;
  location: string | null;
  status: EventStatus;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all events ordered by date descending. */
export async function getAllEvents(): Promise<EventRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("events")
    .select("id, name, type, date, venue, location, status")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/** Returns a single event by id, or null if not found. */
export async function getEvent(id: string): Promise<EventRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("events")
    .select("id, name, type, date, venue, location, status")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw new Error(error.message);
  }
  return data;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function insertEvent(
  payload: EventPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("events").insert(payload);
  if (error) return { error: error.message };
  return {};
}

export async function updateEvent(
  id: string,
  payload: EventPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("events").update(payload).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
