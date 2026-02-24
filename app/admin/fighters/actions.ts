"use server";

import { revalidatePath } from "next/cache";
import {
  insertFighter,
  updateFighter as dbUpdateFighter,
  deleteFighter as dbDeleteFighter,
  type FighterPayload,
} from "@/lib/db/fighters";

export type { FighterPayload };

export async function addFighter(payload: FighterPayload) {
  const result = await insertFighter(payload);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/fighters");
  return {};
}

export async function updateFighter(id: string, payload: FighterPayload) {
  const result = await dbUpdateFighter(id, payload);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/fighters");
  return {};
}

export async function deleteFighter(id: string) {
  const result = await dbDeleteFighter(id);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/fighters");
  return {};
}
