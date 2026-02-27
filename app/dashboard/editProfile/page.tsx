import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/users";
import { EditProfileForm } from "./_components/edit-profile-form";

export default async function EditProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getUserProfile(user.id);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight text-primary drop-shadow-neon-sm">
            Fantasy Fight League
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-8 px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-neon"
        >
          <ChevronLeft size={15} />
          Back to Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Edit Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your display name and profile picture.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <EditProfileForm
            name={profile?.name ?? null}
            email={user.email ?? ""}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </div>
      </main>
    </div>
  );
}
