import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Full fighter row returned by the fighters admin table. */
export type FighterRow = {
  id: string;
  name: string;
  nickname: string | null;
  nationality: string | null;
  date_of_birth: string | null;
};

/** Minimal fighter shape used in fight dropdowns and nested relations. */
export type FighterSummary = {
  id: string;
  name: string;
  nickname: string | null;
};

export type FighterPayload = {
  name: string;
  nickname: string | null;
  nationality: string | null;
  date_of_birth: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Returns all fighters with full details, ordered by name. */
export async function getAllFighters(): Promise<FighterRow[]> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("fighters")
    .select("id, name, nickname, nationality, date_of_birth")
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

export async function insertFighter(
  payload: FighterPayload
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db.from("fighters").insert(payload);
  if (error) return { error: error.message };
  return {};
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
