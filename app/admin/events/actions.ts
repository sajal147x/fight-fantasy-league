"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type EventStatus = "upcoming" | "live" | "completed";

export type EventPayload = {
  name: string;
  type: string | null;
  date: string | null;
  venue: string | null;
  location: string | null;
  status: EventStatus;
};

export async function addEvent(payload: EventPayload) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("events").insert(payload);
  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  return {};
}

export async function updateEvent(id: string, payload: EventPayload) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  return {};
}

export async function deleteEvent(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/events");
  return {};
}
