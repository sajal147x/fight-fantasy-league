import { createAdminClient } from "@/lib/supabase/admin";

export type UserProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  is_admin: string;
};

/** Returns the public.users profile for the given user id, or null if not found. */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("users")
    .select("id, name, avatar_url, is_admin")
    .eq("id", userId)
    .single();
  if (error) {
    if (error.code !== "PGRST116") {
      console.error("[db/users] getUserProfile failed:", error.message);
    }
    return null;
  }
  return data;
}

/** Updates name and/or avatar_url for the given user. */
export async function updateUserProfile(
  userId: string,
  fields: { name?: string; avatar_url?: string }
): Promise<{ error?: string }> {
  const db = createAdminClient();
  const { error } = await db
    .from("users")
    .update(fields)
    .eq("id", userId);
  if (error) return { error: error.message };
  return {};
}
