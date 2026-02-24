"use server";

import { revalidatePath } from "next/cache";
import { insertFighter, updateFighter as dbUpdateFighter, deleteFighter as dbDeleteFighter, uploadFighterImage } from "@/lib/db/fighters";
import type { FighterPayload } from "@/lib/db/fighters";

export async function addFighter(payload: FighterPayload) {
  const result = await insertFighter(payload);
  if (result.error) return { error: result.error };
  revalidatePath("/admin/fighters");
  return { id: result.id };
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

/**
 * Accepts FormData with `fighterId` (string) and `image` (File).
 * Uploads the image to storage and updates the fighters.image_url column.
 */
export async function saveFighterImage(formData: FormData) {
  const fighterId = formData.get("fighterId");
  const file = formData.get("image");

  if (typeof fighterId !== "string" || !fighterId) {
    return { error: "Missing fighter ID" };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No image provided" };
  }

  const result = await uploadFighterImage(fighterId, file);
  if ("error" in result) return { error: result.error };

  revalidatePath("/admin/fighters");
  return { url: result.url };
}
