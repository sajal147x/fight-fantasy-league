"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateUserProfile } from "@/lib/db/users";

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const avatarFile = formData.get("avatar") as File | null;

  const fields: { name?: string; avatar_url?: string } = {};

  if (name) fields.name = name;

  if (avatarFile && avatarFile.size > 0) {
    const db = createAdminClient();
    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const path = `${user.id}.${ext}`;

    const { error: uploadError } = await db.storage
      .from("profilePictures")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = db.storage
      .from("profilePictures")
      .getPublicUrl(path);

    fields.avatar_url = urlData.publicUrl;
  }

  if (Object.keys(fields).length > 0) {
    const { error } = await updateUserProfile(user.id, fields);
    if (error) throw new Error(error);
  }

  redirect("/dashboard");
}
