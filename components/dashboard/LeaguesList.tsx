import Link from "next/link";
import { Shield, Trophy, Users } from "lucide-react";
import { getLeaguesForUser, getScoringRulesets } from "@/lib/db/leagues";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CreateLeagueDialog } from "@/app/dashboard/_components/create-league-dialog";
import { JoinLeagueDialog } from "@/app/dashboard/_components/join-league-dialog";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function LeaguesSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex gap-2 sm:shrink-0">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* 3 placeholder cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5"
          >
            <Skeleton className="h-5 w-3/4" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="mt-2 h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export async function LeaguesList({ userId }: { userId: string }) {
  const [leagues, rulesets] = await Promise.all([
    getLeaguesForUser(userId),
    getScoringRulesets(),
  ]);

  return (
    <div className="space-y-4">
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
          <Trophy size={36} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Create a league or ask a friend for an invite code to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <div
              key={league.id}
              className={cn(
                "relative flex flex-col rounded-lg border bg-card p-5 transition-shadow hover:shadow-neon-sm",
                league.role === "owner" ? "border-neon/40" : "border-border"
              )}
            >
              {league.role === "owner" && (
                <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-lg bg-neon/70" />
              )}

              <h2 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
                {league.name}
              </h2>

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

              {league.scoring_rulesets && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Ruleset:{" "}
                  <span className="text-foreground">
                    {league.scoring_rulesets.name}
                  </span>
                </p>
              )}

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
    </div>
  );
}
