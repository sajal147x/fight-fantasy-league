import { redirect } from "next/navigation";
import Link from "next/link";
import { Shield, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLeaguesForUser, getScoringRulesets } from "@/lib/db/leagues";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CreateLeagueDialog } from "./_components/create-league-dialog";
import { JoinLeagueDialog } from "./_components/join-league-dialog";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [leagues, rulesets] = await Promise.all([
    getLeaguesForUser(user.id),
    getScoringRulesets(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight text-primary drop-shadow-neon-sm">
            Fantasy Fight League
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

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        {/* Section header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              My Leagues
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {leagues.length === 0
                ? "You're not in any leagues yet."
                : `${leagues.length} league${leagues.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <JoinLeagueDialog />
            <CreateLeagueDialog rulesets={rulesets} />
          </div>
        </div>

        {/* Empty state */}
        {leagues.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-20 text-center">
            <Trophy
              size={36}
              className="mx-auto mb-3 text-muted-foreground"
            />
            <p className="text-sm text-muted-foreground">
              Create a league or ask a friend for an invite code to get started.
            </p>
          </div>
        ) : (
          /* League cards grid */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {leagues.map((league) => (
              <div
                key={league.id}
                className={cn(
                  "relative flex flex-col rounded-lg border bg-card p-5 transition-shadow hover:shadow-neon-sm",
                  league.role === "owner"
                    ? "border-neon/40"
                    : "border-border"
                )}
              >
                {/* Neon top accent line for owners */}
                {league.role === "owner" && (
                  <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-neon/70" />
                )}

                {/* League name */}
                <h2 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
                  {league.name}
                </h2>

                {/* Role + member count */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1",
                      league.role === "owner"
                        ? "bg-neon/10 text-neon ring-neon/30"
                        : "bg-muted text-muted-foreground ring-border"
                    )}
                  >
                    {league.role === "owner" && <Shield size={10} />}
                    {league.role.charAt(0).toUpperCase() + league.role.slice(1)}
                  </span>

                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {league.member_count}{" "}
                    {league.member_count === 1 ? "member" : "members"}
                  </span>
                </div>

                {/* Scoring ruleset label */}
                {league.scoring_rulesets && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Ruleset:{" "}
                    <span className="text-foreground">
                      {league.scoring_rulesets.name}
                    </span>
                  </p>
                )}

                {/* View League CTA */}
                <div className="mt-auto pt-4">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-border bg-transparent text-foreground hover:border-neon/50 hover:bg-neon/5 hover:text-neon"
                  >
                    <Link href={`/dashboard/leagues/${league.id}`}>
                      View League
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
