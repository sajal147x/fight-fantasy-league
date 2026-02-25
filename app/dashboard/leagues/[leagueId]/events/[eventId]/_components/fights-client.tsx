"use client";

import { useState, useTransition } from "react";
import { BarChart2, Lock, Pencil, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { savePick } from "../actions";
import type { FightWithDetails, FighterDetails, PickRow } from "@/lib/db/picks";

// ─── Types ────────────────────────────────────────────────────────────────────

type PicksMap = Record<string, string>; // fight_id → picked_fighter_id

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCategory(category: string) {
  switch (category) {
    case "main_card":
      return "Main Card";
    case "prelim":
      return "Prelim";
    case "early_prelim":
      return "Early Prelim";
    default:
      return category;
  }
}

const CATEGORY_ORDER = ["main_card", "prelim", "early_prelim"] as const;

// ─── FighterBox ───────────────────────────────────────────────────────────────

interface FighterBoxProps {
  fighter: FighterDetails;
  odds: string | null;
  isPicked: boolean;
  isClickable: boolean;
  onClick: () => void;
}

function FighterBox({
  fighter,
  odds,
  isPicked,
  isClickable,
  onClick,
}: FighterBoxProps) {
  const [statsOpen, setStatsOpen] = useState(false);

  return (
    <>
      <div
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? onClick : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") onClick();
              }
            : undefined
        }
        className={cn(
          "flex flex-1 flex-col items-center gap-2 rounded-xl border border-border bg-background p-3 transition-all duration-200",
          isClickable &&
            "cursor-pointer hover:border-neon/40 hover:bg-neon/5"
        )}
      >
        {/* Fighter image */}
        <div
          className={cn(
            "relative h-16 w-16 overflow-hidden rounded-full border-2 transition-all duration-200 sm:h-20 sm:w-20",
            isPicked ? "border-neon shadow-neon-sm" : "border-border"
          )}
        >
          {fighter.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fighter.image_url}
              alt={fighter.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <User size={28} className="text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Name */}
        <span className="text-center text-xs font-bold leading-tight text-foreground sm:text-sm">
          {fighter.name}
        </span>

        {/* Odds */}
        {odds ? (
          <span className="text-xs font-semibold text-muted-foreground">
            {odds}
          </span>
        ) : (
          <span className="select-none text-xs text-transparent">-</span>
        )}

        {/* Stats button — always clickable, stops pick propagation */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStatsOpen(true);
          }}
          className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-neon/50 hover:text-neon"
        >
          <BarChart2 size={9} />
          Stats
        </button>
      </div>

      {/* Fighter stats dialog */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-xs border-border bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Fighter Stats
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* Photo */}
            <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-neon shadow-neon-sm">
              {fighter.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fighter.image_url}
                  alt={fighter.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">
                  <User size={44} className="text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Name */}
            <div className="space-y-1 text-center">
              <p className="text-xl font-extrabold tracking-tight text-foreground">
                {fighter.name}
              </p>
              {fighter.nickname && (
                <p className="text-sm italic text-neon/80">
                  &ldquo;{fighter.nickname}&rdquo;
                </p>
              )}
            </div>

            {/* Details rows */}
            <div className="w-full divide-y divide-border rounded-lg border border-border">
              {[
                { label: "Nationality", value: fighter.nationality },
                { label: "Age", value: fighter.age != null ? `${fighter.age}` : null },
                { label: "Height", value: fighter.height != null ? `${fighter.height} ft` : null },
                { label: "Weight", value: fighter.weight != null ? `${fighter.weight} lbs` : null },
                { label: "Reach", value: fighter.reach != null ? `${fighter.reach}"` : null },
                { label: "Record", value: fighter.record },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {value ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── FightsClient ─────────────────────────────────────────────────────────────

interface FightsClientProps {
  fights: FightWithDetails[];
  initialPicks: PickRow[];
  leagueId: string;
  isLocked: boolean;
}

export function FightsClient({
  fights,
  initialPicks,
  leagueId,
  isLocked,
}: FightsClientProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [picks, setPicks] = useState<PicksMap>(() => {
    const map: PicksMap = {};
    for (const pick of initialPicks) {
      map[pick.fight_id] = pick.picked_fighter_id;
    }
    return map;
  });
  const [, startTransition] = useTransition();

  function handlePick(fightId: string, fighterId: string) {
    if (!isEditing || isLocked) return;
    const prevPicks = { ...picks };
    // Optimistic update — immediately reflect the pick in UI
    setPicks((prev) => ({ ...prev, [fightId]: fighterId }));
    startTransition(async () => {
      const result = await savePick(leagueId, fightId, fighterId);
      if (result.error) {
        // Revert if the server action failed
        setPicks(prevPicks);
      }
    });
  }

  // Group fights by category, maintaining server sort order (bout_order desc)
  const groups: Record<string, FightWithDetails[]> = {
    main_card: [],
    prelim: [],
    early_prelim: [],
  };
  for (const fight of fights) {
    if (groups[fight.category]) {
      groups[fight.category].push(fight);
    } else {
      groups[fight.category] = [fight];
    }
  }

  const pickedCount = Object.keys(picks).length;

  return (
    <div className="space-y-8">
      {/* ── Controls bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pickedCount} of {fights.length} picks made
        </p>

        {isLocked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Lock size={11} />
            Picks Locked
          </span>
        ) : (
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200",
              isEditing
                ? "border-neon bg-neon/10 text-neon shadow-neon-sm"
                : "border-border bg-muted text-muted-foreground hover:border-neon/50 hover:text-neon"
            )}
          >
            <Pencil size={11} />
            {isEditing ? "Done" : "Edit Picks"}
          </button>
        )}
      </div>

      {/* ── Edit mode hint ────────────────────────────────────────────────── */}
      {isEditing && !isLocked && (
        <p className="rounded-lg border border-neon/20 bg-neon/5 px-4 py-2.5 text-center text-xs text-neon/80">
          Tap a fighter to record your pick
        </p>
      )}

      {/* ── Fights by category ────────────────────────────────────────────── */}
      {fights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No fights scheduled yet.
          </p>
        </div>
      ) : (
        CATEGORY_ORDER.map((cat) => {
          const catFights = groups[cat] ?? [];
          if (catFights.length === 0) return null;

          return (
            <div key={cat} className="space-y-4">
              {/* Category section header */}
              <div className="flex items-center gap-3">
                <h2
                  className={cn(
                    "shrink-0 text-xs font-bold uppercase tracking-widest",
                    cat === "main_card"
                      ? "text-neon drop-shadow-neon-sm"
                      : "text-muted-foreground"
                  )}
                >
                  {formatCategory(cat)}
                </h2>
                <div className="flex-1 border-t border-border" />
              </div>

              {/* Fight cards */}
              <div className="space-y-3">
                {catFights.map((fight) => {
                  const f1 = fight.fight_participants.find(
                    (p) => p.corner === "fighter_1"
                  );
                  const f2 = fight.fight_participants.find(
                    (p) => p.corner === "fighter_2"
                  );
                  const pickedFighterId = picks[fight.id];

                  return (
                    <div
                      key={fight.id}
                      className="rounded-xl border border-border bg-card p-4 transition-shadow"
                    >
                      {/* Fighter row */}
                      <div className="flex items-stretch gap-3">
                        {/* Fighter 1 */}
                        {f1 ? (
                          <FighterBox
                            fighter={f1.fighters}
                            odds={f1.odds}
                            isPicked={pickedFighterId === f1.fighters.id}
                            isClickable={isEditing && !isLocked}
                            onClick={() =>
                              handlePick(fight.id, f1.fighters.id)
                            }
                          />
                        ) : (
                          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border py-8 text-xs text-muted-foreground">
                            TBA
                          </div>
                        )}

                        {/* VS divider */}
                        <div className="flex shrink-0 flex-col items-center justify-center px-1">
                          <span className="text-base font-black tracking-widest text-muted-foreground/60 sm:text-xl">
                            VS
                          </span>
                        </div>

                        {/* Fighter 2 */}
                        {f2 ? (
                          <FighterBox
                            fighter={f2.fighters}
                            odds={f2.odds}
                            isPicked={pickedFighterId === f2.fighters.id}
                            isClickable={isEditing && !isLocked}
                            onClick={() =>
                              handlePick(fight.id, f2.fighters.id)
                            }
                          />
                        ) : (
                          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border py-8 text-xs text-muted-foreground">
                            TBA
                          </div>
                        )}
                      </div>

                      {/* Weight class + category */}
                      <div className="mt-3 flex items-center justify-center gap-2">
                        {fight.weight_class && (
                          <span className="text-xs text-muted-foreground">
                            {fight.weight_class}
                          </span>
                        )}
                        {fight.weight_class && (
                          <span className="text-xs text-border">·</span>
                        )}
                        <span
                          className={cn(
                            "text-xs font-semibold uppercase tracking-wider",
                            fight.category === "main_card"
                              ? "text-neon/70"
                              : "text-muted-foreground/70"
                          )}
                        >
                          {formatCategory(fight.category)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
