import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { getUpcomingEventIds } from "@/lib/db/events";
import { EventsBanners } from "@/components/events/EventsBanners";
import { LoginForm } from "./_components/login-form";

export default async function LoginPage() {
  const eventIds = await getUpcomingEventIds();

  return (
    <main className="flex min-h-screen flex-col items-center py-16 px-4 gap-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Branding */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">
            Fantasy Fight League
          </h1>
          <p className="text-sm text-muted-foreground">
            Build your roster. Win the fight.
          </p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>
      </div>

      {eventIds.length > 0 && (
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Upcoming Events
            </h2>
          </div>
          <EventsBanners eventIds={eventIds} />
        </div>
      )}
    </main>
  );
}
