"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchLeaderboard } from "../actions";
import type { LeaderboardEntry } from "@/lib/db/leagues";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventPill = { id: string; name: string; date: string | null };

interface LeaderboardSectionProps {
  leagueId: string;
  currentUserId: string;
  events: EventPill[];
  initialLeaderboard: LeaderboardEntry[];
  defaultEventId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function PicksBar({ picks, total }: { picks: number; total: number }) {
  const pct = total > 0 ? Math.round((picks / total) * 100) : 0;
  return (
    <div className="w-24 space-y-0.5">
      <p className="text-right font-mono text-[10px] text-muted-foreground tabular-nums">
        {picks}/{total} picks made
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeaderboardSection({
  leagueId,
  currentUserId,
  events,
  initialLeaderboard,
  defaultEventId,
}: LeaderboardSectionProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(
    defaultEventId
  );
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [isPending, startTransition] = useTransition();

  function handleSelect(eventId: string | null) {
    if (eventId === selectedEventId) return;
    setSelectedEventId(eventId);
    startTransition(async () => {
      const data = await fetchLeaderboard(leagueId, eventId);
      setLeaderboard(data);
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Trophy size={16} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Leaderboard
        </h2>
      </div>

      {/* ── Event filter dropdown ──────────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="mb-4">
          <Select
            value={selectedEventId ?? "all"}
            onValueChange={(val) => handleSelect(val === "all" ? null : val)}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Leaderboard table ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "transition-opacity duration-150",
          isPending && "pointer-events-none opacity-50"
        )}
      >
        {leaderboard.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center">
            <Trophy size={28} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No members yet.</p>
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
                    Picks
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground sm:px-4">
                    Pts
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.user_id === currentUserId;
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
                              alt={entry.user_name}
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
                              {entry.user_name}
                            </span>
                            <div className="mt-1 sm:hidden">
                              <PicksBar picks={entry.picks_made} total={entry.total_fights} />
                            </div>
                          </div>
                          {isMe && (
                            <span className="ml-0.5 shrink-0 text-xs font-normal text-neon/60">
                              (you)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Picks progress bar — desktop only */}
                      <td className="hidden px-3 py-2.5 sm:table-cell sm:px-4 sm:py-3">
                        <div className="flex justify-end">
                          <PicksBar picks={entry.picks_made} total={entry.total_fights} />
                        </div>
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
      </div>
    </section>
  );
}
