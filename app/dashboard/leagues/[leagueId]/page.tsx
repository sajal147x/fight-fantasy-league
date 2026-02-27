import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronLeft, Shield, Ticket, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getLeagueById,
  getMembershipForUser,
  getLeagueLeaderboard,
} from "@/lib/db/leagues";
import {
  getEventsForLeague,
  getAvailableEvents,
} from "@/lib/db/league-events";
import { getUserProfile } from "@/lib/db/users";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/app/admin/events/_components/status-badge";
import { InviteCodeCopy } from "./_components/invite-code-copy";
import { AddEventDialog } from "./_components/add-event-dialog";
import { ProfileButton } from "@/app/dashboard/_components/profile-button";
import type { LeagueMemberRole } from "@/lib/db/leagues";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

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

  // Fetch league, membership, and profile in parallel
  const [league, membership, profile] = await Promise.all([
    getLeagueById(leagueId),
    getMembershipForUser(leagueId, user.id),
    getUserProfile(user.id),
  ]);

  if (!league) notFound();

  // Redirect non-members back to the dashboard
  if (!membership) redirect("/dashboard");

  const isOwner = membership.role === "owner";

  // Fetch league events, available events, and leaderboard in parallel
  const [ leagueEvents, availableEvents, leaderboard] =
    await Promise.all([
      getEventsForLeague(leagueId),
      isOwner ? getAvailableEvents(leagueId) : Promise.resolve([]),
      getLeagueLeaderboard(leagueId),
    ]);

  const activeEvents = leagueEvents.filter(({ events: e }) => e.status !== "completed");
  const pastEvents = leagueEvents.filter(({ events: e }) => e.status === "completed");

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


        {/* ── Leaderboard ───────────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Leaderboard
            </h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <Trophy size={28} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No picks have been graded yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="w-12 px-3 py-2.5 text-left font-semibold text-muted-foreground sm:px-4">
                      #
                    </th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground sm:px-4">
                      Player
                    </th>
                    <th className="hidden px-3 py-2.5 text-right font-semibold text-muted-foreground sm:table-cell sm:px-4">
                      Correct
                    </th>
                    <th className="hidden px-3 py-2.5 text-right font-semibold text-muted-foreground sm:table-cell sm:px-4">
                      Picks
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground sm:px-4">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaderboard.map((entry, i) => {
                    const isMe = entry.user_id === user.id;
                    const displayName = entry.user_name;

                    return (
                      <tr
                        key={entry.user_id}
                        className={cn(
                          "transition-colors",
                          isMe
                            ? "bg-neon/10 hover:bg-neon/15"
                            : "hover:bg-muted/30"
                        )}
                      >
                        {/* Rank */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <span
                            className={cn(
                              "font-mono text-xs",
                              i === 0
                                ? "font-bold text-neon drop-shadow-neon-sm"
                                : "text-muted-foreground"
                            )}
                          >
                            {ordinal(i + 1)}
                          </span>
                        </td>

                        {/* Player */}
                        <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            {entry.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={entry.avatar_url}
                                alt={displayName}
                                className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-border sm:h-7 sm:w-7"
                              />
                            ) : (
                              <div
                                className={cn(
                                  "h-6 w-6 shrink-0 rounded-full sm:h-7 sm:w-7",
                                  isMe
                                    ? "bg-neon/20 ring-1 ring-neon/40"
                                    : "bg-muted"
                                )}
                              />
                            )}
                            <div className="min-w-0">
                              <span
                                className={cn(
                                  "block truncate font-medium leading-tight",
                                  isMe ? "text-neon" : "text-foreground"
                                )}
                              >
                                {displayName}
                              </span>
                              {/* Mobile-only stat summary under name */}
                              <span className="block text-xs text-muted-foreground sm:hidden">
                                {entry.correct_picks}/{entry.total_picks} correct
                              </span>
                            </div>
                            {isMe && (
                              <span className="ml-0.5 shrink-0 text-xs font-normal text-neon/60">
                                (you)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Correct picks — desktop only */}
                        <td className="hidden px-3 py-2.5 text-right tabular-nums text-foreground sm:table-cell sm:px-4 sm:py-3">
                          {entry.correct_picks}
                        </td>

                        {/* Total picks — desktop only */}
                        <td className="hidden px-3 py-2.5 text-right tabular-nums text-muted-foreground sm:table-cell sm:px-4 sm:py-3">
                          {entry.total_picks}
                        </td>

                        {/* Points */}
                        <td className="px-3 py-2.5 text-right sm:px-4 sm:py-3">
                          <span
                            className={cn(
                              "font-semibold tabular-nums",
                              i === 0
                                ? "text-neon drop-shadow-neon-sm"
                                : "text-foreground"
                            )}
                          >
                            {entry.total_points}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
            <div className="space-y-6">
              {/* Active events */}
              {activeEvents.length > 0 && (
                <div className="space-y-3">
                  {activeEvents.map(({ id, events: event }) => (
                    <Link
                      key={id}
                      href={`/dashboard/leagues/${leagueId}/events/${event.id}`}
                      className="block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-neon-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                        {event.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.image_url}
                            alt={event.name}
                            className="aspect-video w-full object-cover sm:aspect-auto sm:h-14 sm:w-20 sm:shrink-0 sm:rounded-md"
                          />
                        ) : (
                          <div className="flex aspect-video w-full items-center justify-center bg-muted sm:aspect-auto sm:h-14 sm:w-20 sm:shrink-0 sm:rounded-md">
                            <CalendarDays size={20} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-1 items-center gap-3 p-3 sm:p-0">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-semibold text-foreground">{event.name}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              {event.date && <span>{formatDate(event.date)}</span>}
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
                    </Link>
                  ))}
                </div>
              )}

              {/* Past events */}
              {pastEvents.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Past Events
                  </p>
                  {pastEvents.map(({ id, events: event }) => (
                    <Link
                      key={id}
                      href={`/dashboard/leagues/${leagueId}/events/${event.id}`}
                      className="block overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-neon-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 sm:p-4">
                        {event.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={event.image_url}
                            alt={event.name}
                            className="aspect-video w-full object-cover sm:aspect-auto sm:h-14 sm:w-20 sm:shrink-0 sm:rounded-md"
                          />
                        ) : (
                          <div className="flex aspect-video w-full items-center justify-center bg-muted sm:aspect-auto sm:h-14 sm:w-20 sm:shrink-0 sm:rounded-md">
                            <CalendarDays size={20} className="text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-1 items-center gap-3 p-3 sm:p-0">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-semibold text-foreground">{event.name}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                              {event.date && <span>{formatDate(event.date)}</span>}
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
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

