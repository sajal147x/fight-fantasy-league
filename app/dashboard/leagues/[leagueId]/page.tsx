import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, Shield, Ticket, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getLeagueById,
  getMembershipForUser,
  getMembersForLeague,
} from "@/lib/db/leagues";
import {
  getEventsForLeague,
  getAvailableEvents,
} from "@/lib/db/league-events";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/app/admin/events/_components/status-badge";
import { InviteCodeCopy } from "./_components/invite-code-copy";
import { AddEventDialog } from "./_components/add-event-dialog";
import type { LeagueMemberRole } from "@/lib/db/leagues";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function RoleBadge({ role }: { role: LeagueMemberRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        role === "owner"
          ? "bg-neon/10 text-neon ring-neon/30"
          : "bg-muted text-muted-foreground ring-border"
      )}
    >
      {role === "owner" && <Shield size={10} />}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function LeagueDetailPage({
  params,
}: {
  params: { leagueId: string };
}) {
  const { leagueId } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch league and current user's membership in parallel
  const [league, membership] = await Promise.all([
    getLeagueById(leagueId),
    getMembershipForUser(leagueId, user.id),
  ]);

  if (!league) notFound();

  // Redirect non-members back to the dashboard
  if (!membership) redirect("/dashboard");

  const isOwner = membership.role === "owner";

  // Fetch members list, league events, and (if owner) available events in parallel
  const [members, leagueEvents, availableEvents] = await Promise.all([
    getMembersForLeague(leagueId),
    getEventsForLeague(leagueId),
    isOwner ? getAvailableEvents(leagueId) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
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

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {/* ── Back link ─────────────────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-neon"
        >
          <ChevronLeft size={15} />
          My Leagues
        </Link>

        {/* ── League header ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                {league.name}
              </h1>
              <RoleBadge role={membership.role as LeagueMemberRole} />
            </div>
          </div>

          {/* Invite code row */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ticket size={14} className="shrink-0" />
            <span>Invite code:</span>
            <InviteCodeCopy code={league.invite_code} />
          </div>
        </div>

        {/* ── Members ───────────────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Users size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Members
              <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">
                ({members.length})
              </span>
            </h2>
          </div>

          <div className="rounded-lg border border-border bg-card">
            {members.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No members yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {members.map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    {/* Avatar initial */}
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          m.role === "owner"
                            ? "bg-neon/10 text-neon ring-1 ring-neon/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {m.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-sm text-foreground">
                        {m.email}
                      </span>
                    </div>
                    <RoleBadge role={m.role} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Events ────────────────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Events
                <span className="ml-1.5 font-normal normal-case text-muted-foreground/60">
                  ({leagueEvents.length})
                </span>
              </h2>
            </div>
            {isOwner && (
              <AddEventDialog
                leagueId={leagueId}
                availableEvents={availableEvents}
              />
            )}
          </div>

          {leagueEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-16 text-center">
              <CalendarDays
                size={32}
                className="mx-auto mb-3 text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                {isOwner
                  ? "No events added yet. Use 'Add Event' to get started."
                  : "No events have been added to this league yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leagueEvents.map(({ id, events: event }) => (
                <div
                  key={id}
                  className="overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-neon-sm"
                >
                  {/* Mobile: image full-bleed above text.
                      sm+: flex row with thumbnail on the left. */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                    {/* Image */}
                    {event.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="aspect-video w-full object-cover sm:aspect-auto sm:h-14 sm:w-20 sm:shrink-0 sm:rounded-md"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted sm:aspect-auto sm:h-14 sm:w-20 sm:shrink-0 sm:rounded-md">
                        <CalendarDays
                          size={20}
                          className="text-muted-foreground"
                        />
                      </div>
                    )}

                    {/* Info + status */}
                    <div className="flex flex-1 items-center gap-3 p-3 sm:p-0">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="font-semibold text-foreground">
                          {event.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          {event.date && (
                            <span>{formatDate(event.date)}</span>
                          )}
                          {event.venue && (
                            <>
                              <span className="text-border">·</span>
                              <span>{event.venue}</span>
                            </>
                          )}
                          {event.location && (
                            <>
                              <span className="text-border">·</span>
                              <span>{event.location}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={event.status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
