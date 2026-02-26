import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MapPin, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLeagueById, getMembershipForUser } from "@/lib/db/leagues";
import { getEvent } from "@/lib/db/events";
import {
  getEventFightsWithParticipants,
  getUserPicksForEvent,
} from "@/lib/db/picks";
import { StatusBadge } from "@/app/admin/events/_components/status-badge";
import { FightsClient } from "./_components/fights-client";
import { EventCountdown } from "@/components/events/EventCountdown";

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function EventFightsPage({
  params,
}: {
  params: { leagueId: string; eventId: string };
}) {
  const { leagueId, eventId } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [league, membership, event] = await Promise.all([
    getLeagueById(leagueId),
    getMembershipForUser(leagueId, user.id),
    getEvent(eventId),
  ]);

  if (!league || !event) notFound();
  if (!membership) redirect("/dashboard");

  const [fights, picks] = await Promise.all([
    getEventFightsWithParticipants(eventId),
    getUserPicksForEvent(user.id, leagueId, eventId),
  ]);

  // Picks lock 1 hour before the event start time
  const isLocked = event.date
    ? new Date() >= new Date(new Date(event.date).getTime() - 60 * 60 * 1000)
    : false;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight text-primary drop-shadow-neon-sm">
            Fight Fantasy League
          </span>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="transition-colors hover:text-neon"
          >
            My Leagues
          </Link>
          <ChevronLeft size={14} className="rotate-180" />
          <Link
            href={`/dashboard/leagues/${leagueId}`}
            className="transition-colors hover:text-neon"
          >
            {league.name}
          </Link>
          <ChevronLeft size={14} className="rotate-180" />
          <span className="text-foreground">{event.name}</span>
        </nav>

        {/* ── Event header ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {event.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image_url}
              alt={event.name}
              className="h-40 w-full object-cover sm:h-52"
            />
          )}

          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Swords size={16} className="shrink-0 text-neon" />
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {event.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {event.date && <EventCountdown eventDate={event.date} />}
                {(event.venue || event.location) && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {[event.venue, event.location].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <StatusBadge status={event.status} />
            </div>
          </div>
        </div>

        {/* ── Fights + picks ─────────────────────────────────────────────────── */}
        <FightsClient
          fights={fights}
          initialPicks={picks}
          leagueId={leagueId}
          initialIsLocked={isLocked}
          eventDate={event.date}
        />
      </main>
    </div>
  );
}
