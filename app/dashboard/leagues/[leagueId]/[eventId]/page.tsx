import {createClient} from "@/lib/supabase/server";
import {redirect} from "next/navigation";
import {getLeagueById} from "@/lib/db/leagues";
import {getEvent} from "@/lib/db/events";
import Link from "next/link";
import {ChevronLeft} from "lucide-react";


// ----------page


export default async function LeagueEventDetailPage({
                                                   params,
                                               }: {
    params: { leagueId: string, eventId: string };
}) {
    const {leagueId, eventId} = params;

    const supabase = await createClient();
    const {
        data: {user},
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch league and current user's membership in parallel
    const [league, event] = await Promise.all([
        getLeagueById(leagueId),
        getEvent(eventId),
    ]);

    return (
        <div className="min-h-screen bg-background">
            {/* ── Top bar ─────────────────────────────────────────────────────────── */}
            <header className="border-b border-border bg-card/60 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight text-primary drop-shadow-neon-sm">
            Fight Fantasy League
          </span>
                    <div className="flex items-center gap-4">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
                        <form action="/auth/signout" method="post">
                            <button
                                type="submit"
                                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                            >
                                Sign out
                            </button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
                {/* ── Back link ─────────────────────────────────────────────────────── */}
                <Link href={`/dashboard/leagues/${league.id}`}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-neon"
                >
                    <ChevronLeft size={15}/>
                    My League
                </Link>
            </main>
        </div>

    );

}

