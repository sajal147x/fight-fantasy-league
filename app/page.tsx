import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getUpcomingEventIds } from "@/lib/db/events";
import { EventsBanners } from "@/components/events/EventsBanners";

export default async function Home() {
  const eventIds = await getUpcomingEventIds();

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="space-y-6 max-w-lg">
          <h1 className="text-5xl font-extrabold tracking-tight text-neon drop-shadow-neon">
            Fantasy Fight League
          </h1>
          <p className="text-lg text-muted-foreground">
            Build your roster. Pick your fighters. Win the fight.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-md bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-neon transition-shadow hover:shadow-neon-lg"
          >
            Login / Sign Up
          </Link>
        </div>
      </div>

      {/* Upcoming Events */}
      {eventIds.length > 0 && (
        <div className="mx-auto max-w-2xl px-4 pb-16 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming Events
            </h2>
          </div>
          <EventsBanners eventIds={eventIds} />
        </div>
      )}
    </main>
  );
}
