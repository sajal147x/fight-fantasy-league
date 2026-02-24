import type { EventStatus } from "@/lib/db/events";

export function StatusBadge({ status }: { status: EventStatus | string | null }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neon/10 px-2.5 py-1 text-xs font-semibold text-neon">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
        Live
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
      Upcoming
    </span>
  );
}
