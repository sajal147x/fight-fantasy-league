import { createAdminClient } from "@/lib/supabase/admin";
import { EventsTable } from "./_components/events-table";

export default async function EventsPage() {
  const supabase = createAdminClient();
  const { data: events, error } = await supabase
    .from("events")
    .select("id, name, type, date, venue, location, status")
    .order("date", { ascending: false });

  if (error) {
    console.error("[events page]", error.message);
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
      <EventsTable events={events ?? []} />
    </div>
  );
}
