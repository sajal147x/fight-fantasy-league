import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getEventsByIds } from "@/lib/db/events";
import { StatusBadge } from "@/app/admin/events/_components/status-badge";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function EventsBanners({
  eventIds,
  getHref,
}: {
  eventIds: string[];
  getHref?: (eventId: string) => string;
}) {
  const events = await getEventsByIds(eventIds);
  if (events.length === 0) return null;

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const href = getHref?.(event.id);
        const Wrapper = href
          ? ({ children }: { children: React.ReactNode }) => (
              <Link
                href={href}
                className="block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-neon/40 hover:bg-card/80"
              >
                {children}
              </Link>
            )
          : ({ children }: { children: React.ReactNode }) => (
              <div className="overflow-hidden rounded-lg border border-border bg-card">
                {children}
              </div>
            );
        return (
        <Wrapper key={event.id}>
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
        </Wrapper>
        );
      })}
    </div>
  );
}
