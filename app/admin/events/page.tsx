import { getAllEvents } from "@/lib/db/events";
import type { EventRow } from "@/lib/db/events";
import { EventsTable } from "./_components/events-table";

export default async function EventsPage() {
  let events: EventRow[];
  try {
    events = await getAllEvents();
  } catch (err) {
    console.error("[events page]", err);
    events = [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Events
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage all events in the league.
        </p>
      </div>
      <EventsTable events={events} />
    </div>
  );
}
