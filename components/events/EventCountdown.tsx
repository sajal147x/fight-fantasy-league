"use client";

import { useState, useEffect } from "react";
import { CalendarDays, Clock, Lock } from "lucide-react";
import { formatEventDate } from "@/lib/utils/dates";

interface Props {
  eventDate: string;
}

/** Returns the ms timestamp at which picks lock (1 hour before event). */
function getLockTimeMs(eventDate: string): number {
  return new Date(eventDate).getTime() - 60 * 60 * 1000;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

/**
 * Renders the event date in the user's local timezone and a live countdown
 * to the pick lock time (1 hour before the event). When locked, shows a
 * "Picks Locked" badge instead.
 *
 * Returns a fragment so it composes naturally inside a parent flex row.
 */
export function EventCountdown({ eventDate }: Props) {
  const lockTime = getLockTimeMs(eventDate);

  // null = not yet hydrated (avoids SSR / client timezone mismatch)
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setTimeLeftMs(Math.max(0, lockTime - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lockTime]);

  const isLocked = timeLeftMs !== null && timeLeftMs <= 0;

  return (
    <>
      <span className="flex items-center gap-1">
        <CalendarDays size={12} />
        {/* suppressHydrationWarning: timezone differs between server and browser */}
        <span suppressHydrationWarning>{formatEventDate(eventDate)}</span>
      </span>

      {timeLeftMs === null ? null : isLocked ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Lock size={9} />
          Picks Locked
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Clock size={12} />
          Picks lock in:{" "}
          <span className="font-mono text-neon/80">
            {formatCountdown(timeLeftMs)}
          </span>
        </span>
      )}
    </>
  );
}
