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
  image_url: string | null;
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
    .select("id, name, type, date, venue, location, status, image_url")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/** Returns events matching the given ids, ordered by date ascending. */
export async function getEventsByIds(ids: string[]): Promise<EventRow[]> {
  if (ids.length === 0) return [];
  const db = createAdminClient();
  const { data, error } = await db
    .from("events")
    .select("id, name, type, date, venue, location, status, image_url")
    .in("id", ids)
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

/** Returns ids of all upcoming and live events ordered by date ascending. */
export async function getUpcomingEventIds(): Promise<string[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("events")
    .select("id")
    .in("status", ["upcoming"])
    .order("date", { ascending: true });
  if (error) throw new Error(error.message);
  console.log(data)
  return (data ?? []).map((r) => r.id);
}

/** Returns a single event by id, or null if not found. */
export async function getEvent(id: string): Promise<EventRow | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("events")
    .select("id, name, type, date, venue, location, status, image_url")
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
): Promise<{ id?: string; error?: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("events")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
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

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Uploads an event image to the `events` storage bucket as `{eventId}.{ext}`,
 * then stores the resulting public URL in events.image_url.
 *
 * Prerequisite migration:
 *   ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url text;
 */
export async function uploadEventImage(
  eventId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const db = createAdminClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${eventId}.${ext}`;

  // Convert to ArrayBuffer for reliable upload in the Node.js runtime
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await db.storage
    .from("events")
    .upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type || `image/${ext}`,
    });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = db.storage.from("events").getPublicUrl(path);

  const { error: updateError } = await db
    .from("events")
    .update({ image_url: urlData.publicUrl })
    .eq("id", eventId);

  if (updateError) return { error: updateError.message };

  return { url: urlData.publicUrl };
}
