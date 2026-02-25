import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Full fighter row returned by the fighters admin table. */
export type FighterRow = {
  id: string;
  name: string;
  nickname: string | null;
  nationality: string | null;
  image_url: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  reach: number | null;
  record: string | null;
};

/** Minimal fighter shape used in fight dropdowns and nested relations. */
export type FighterSummary = {
  id: string;
  name: string;
  nickname: string | null;
};

// FighterPayload intentionally excludes image_url — images are managed
// separately via uploadFighterImage so other updates never overwrite the URL.
export type FighterPayload = {
  name: string;
  nickname: string | null;
  nationality: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  reach: number | null;
  record: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all fighters with full details, ordered by name. */
export async function getAllFighters(): Promise<FighterRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("fighters")
    .select("id, name, nickname, nationality, image_url, age, height, weight, reach, record")
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

/** Returns all fighters with only id/name/nickname, used for dropdowns. */
export async function getAllFighterSummaries(): Promise<FighterSummary[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("fighters")
    .select("id, name, nickname")
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Inserts a new fighter and returns its id so callers can immediately upload an image. */
export async function insertFighter(
  payload: FighterPayload
): Promise<{ id?: string; error?: string }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("fighters")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateFighter(
  id: string,
  payload: FighterPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("fighters").update(payload).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteFighter(id: string): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("fighters").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Uploads a fighter photo to the `fighters` storage bucket as `{fighterId}.{ext}`,
 * then stores the resulting public URL in fighters.image_url.
 *
 * Prerequisite migration:
 *   ALTER TABLE public.fighters ADD COLUMN IF NOT EXISTS image_url text;
 */
export async function uploadFighterImage(
  fighterId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const db = createAdminClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${fighterId}.${ext}`;

  // Convert to ArrayBuffer for reliable upload in the Node.js runtime
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await db.storage
    .from("fighters")
    .upload(path, arrayBuffer, {
      upsert: true,
      contentType: file.type || `image/${ext}`,
    });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = db.storage.from("fighters").getPublicUrl(path);

  const { error: updateError } = await db
    .from("fighters")
    .update({ image_url: urlData.publicUrl })
    .eq("id", fighterId);

  if (updateError) return { error: updateError.message };

  return { url: urlData.publicUrl };
}
