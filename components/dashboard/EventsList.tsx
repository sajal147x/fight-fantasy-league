import { CalendarDays } from "lucide-react";
import { getAllEventIdsByStatus } from "@/lib/db/events";
import { EventsBanners } from "@/components/events/EventsBanners";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function EventsSkeleton() {
  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-muted-foreground" />
        <Skeleton className="h-4 w-14" />
      </div>

      {/* 3 placeholder event banners */}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-lg border border-border bg-card"
          >
            {/* Mobile: full-bleed image area */}
            <Skeleton className="aspect-video w-full sm:hidden" />

            {/* Desktop: thumbnail + text row */}
            <div className="hidden sm:flex sm:items-center sm:gap-4 sm:p-4">
              <Skeleton className="h-14 w-20 shrink-0 rounded-md" />
              <div className="flex flex-1 items-center justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>

            {/* Mobile: text area below the image skeleton */}
            <div className="flex items-center gap-3 p-3 sm:hidden">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export async function EventsList() {
  const { activeIds, pastIds } = await getAllEventIdsByStatus();

  if (activeIds.length === 0 && pastIds.length === 0) return null;

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarDays size={16} className="text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Events
        </h2>
      </div>

      {activeIds.length > 0 && (
        <EventsBanners
          eventIds={activeIds}
          getHref={(id) => `/dashboard/events/${id}`}
        />
      )}

      {pastIds.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Past Events
          </p>
          <EventsBanners
            eventIds={pastIds}
            getHref={(id) => `/dashboard/events/${id}`}
          />
        </div>
      )}
    </section>
  );
}
