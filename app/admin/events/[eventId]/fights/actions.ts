"use server";

import { revalidatePath } from "next/cache";
import {
  insertFight,
  updateFight as dbUpdateFight,
  deleteFight as dbDeleteFight,
} from "@/lib/db/fights";
import type { AddFightPayload, UpdateFightPayload } from "@/lib/db/fights";

export async function addFight(payload: AddFightPayload) {
  const result = await insertFight(payload);
  if (result.error) return { error: result.error };
  revalidatePath(`/admin/events/${payload.eventId}/fights`);
  return {};
}

export async function updateFight(
  fightId: string,
  eventId: string,
  payload: UpdateFightPayload
) {
  const result = await dbUpdateFight(fightId, payload);
  if (result.error) return { error: result.error };
  revalidatePath(`/admin/events/${eventId}/fights`);
  return {};
}

export async function deleteFight(fightId: string, eventId: string) {
  const result = await dbDeleteFight(fightId);
  if (result.error) return { error: result.error };
  revalidatePath(`/admin/events/${eventId}/fights`);
  return {};
}
