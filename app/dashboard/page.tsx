import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/users";
import { ProfileButton } from "./_components/profile-button";
import { LeaguesList, LeaguesSkeleton } from "@/components/dashboard/LeaguesList";
import { EventsList, EventsSkeleton } from "@/components/dashboard/EventsList";

export default async function DashboardPage() {
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
          <ProfileButton
            name={profile?.name ?? null}
            email={user.email ?? ""}
            avatarUrl={profile?.avatar_url ?? null}
          />
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <Suspense fallback={<LeaguesSkeleton />}>
          <LeaguesList userId={user.id} />
        </Suspense>

        <Suspense fallback={<EventsSkeleton />}>
          <EventsList />
        </Suspense>
      </main>
    </div>
  );
}
