"use server";

import { revalidatePath } from "next/cache";
import { insertEvent, updateEvent as dbUpdateEvent, deleteEvent as dbDeleteEvent } from "@/lib/db/events";
import type { EventPayload } from "@/lib/db/events";

export async function addEvent(payload: EventPayload) {
  const result = await insertEvent(payload);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/events");
  return {};
}

export async function updateEvent(id: string, payload: EventPayload) {
  const result = await dbUpdateEvent(id, payload);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/events");
  return {};
}

export async function deleteEvent(id: string) {
  const result = await dbDeleteEvent(id);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/events");
  return {};
}
