import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getEvent } from "@/lib/db/events";
import { getFightsForEvent } from "@/lib/db/fights";
import { getAllFighterSummaries } from "@/lib/db/fighters";
import { StatusBadge } from "../../_components/status-badge";
import { FightsTable } from "./_components/fights-table";

export default async function FightsPage({
  params,
}: {
  params: { eventId: string };
}) {
  const { eventId } = params;

  // Fetch event + fights + all fighters in parallel
  const [event, fights, fighters] = await Promise.all([
    getEvent(eventId),
    getFightsForEvent(eventId),
    getAllFighterSummaries(),
  ]);

  if (!event) notFound();

  // Format date for display
  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      })
    : null;

  const meta = [event.type, event.venue, event.location, formattedDate]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      {/* ── Back link ── */}
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-neon"
      >
        <ChevronLeft size={15} />
        Events
      </Link>

      {/* ── Event header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            {event.name}
          </h1>
          {meta && (
            <p className="text-sm text-muted-foreground">{meta}</p>
          )}
        </div>
        <StatusBadge status={event.status} />
      </div>

      {/* ── Fights table ── */}
      <FightsTable
        eventId={eventId}
        fights={fights}
        fighters={fighters}
      />
    </div>
  );
}
