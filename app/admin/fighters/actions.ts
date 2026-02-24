"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

type FighterPayload = {
  name: string;
  nickname: string | null;
  nationality: string | null;
  date_of_birth: string | null;
};

export async function addFighter(payload: FighterPayload) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("fighters").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/admin/fighters");
  return {};
}

export async function updateFighter(id: string, payload: FighterPayload) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("fighters")
    .update(payload)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/fighters");
  return {};
}

export async function deleteFighter(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("fighters").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/fighters");
  return {};
}
