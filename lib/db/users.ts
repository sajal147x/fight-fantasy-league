import { createAdminClient } from "@/lib/supabase/admin";

/** Returns the public.users profile for the given user id, or null if not found. */
export async function getUserProfile(
  userId: string
): Promise<{ is_admin: string } | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("users")
    .select("is_admin")
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
