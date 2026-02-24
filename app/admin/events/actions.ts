"use server";

import { revalidatePath } from "next/cache";
import {
  insertEvent,
  updateEvent as dbUpdateEvent,
  deleteEvent as dbDeleteEvent,
  uploadEventImage,
} from "@/lib/db/events";
import type { EventPayload } from "@/lib/db/events";

export async function addEvent(payload: EventPayload) {
  const result = await insertEvent(payload);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/events");
  return { id: result.id };
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

/**
 * Accepts FormData with `eventId` (string) and `image` (File).
 * Uploads the image to storage and updates the events.image_url column.
 */
export async function saveEventImage(formData: FormData) {
  const eventId = formData.get("eventId");
  const file = formData.get("image");

  if (typeof eventId !== "string" || !eventId) {
    return { error: "Missing event ID" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No image provided" };
  }

  const result = await uploadEventImage(eventId, file);
  if ("error" in result) return { error: result.error };

  revalidatePath("/admin/events");
  return { url: result.url };
}
