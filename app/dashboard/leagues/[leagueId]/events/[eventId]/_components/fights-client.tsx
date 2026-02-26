"use client";

import { useState, useEffect } from "react";
import { BarChart2, Check, ChevronDown, Loader2, Lock, Pencil, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { savePick } from "../actions";
import type { FightWithDetails, FighterDetails, PickRow } from "@/lib/db/picks";
import { formatWinMethod } from "@/lib/utils/fights";

// ─── Types ────────────────────────────────────────────────────────────────────

type PicksMap = Record<string, string>; // fight_id → picked_fighter_id

function buildResultLabel(fight: FightWithDetails): string | null {
  if (!fight.winner_id) return null;
  const parts: string[] = [];
  if (fight.win_method) parts.push(formatWinMethod(fight.win_method));
  if (fight.round != null) parts.push(`R${fight.round}`);
  if (fight.time) parts.push(fight.time);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function computeIsLocked(eventDate: string | null): boolean {
  if (!eventDate) return false;
  return Date.now() >= new Date(eventDate).getTime() - 60 * 60 * 1000;
}

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
  isEditing: boolean;
  isLocked: boolean;
  isSaving: boolean;
  isWinner: boolean;
  isLoser: boolean;
  resultLabel: string | null;
  onClick: () => void;
}

function FighterBox({
  fighter,
  odds,
  isPicked,
  isEditing,
  isLocked,
  isSaving,
  isWinner,
  isLoser,
  resultLabel,
  onClick,
}: FighterBoxProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const isClickable = isEditing && !isLocked && !isSaving;

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
          "flex flex-1 flex-col items-center gap-2 rounded-xl border bg-background p-3 transition-all duration-200",
          isPicked ? "border-neon shadow-neon-sm" : "border-border",
          isClickable && "cursor-pointer hover:border-neon/40 hover:bg-neon/5",
          isLocked && "cursor-not-allowed opacity-60",
          isSaving && "animate-pulse"
        )}
      >
        {/* Fighter image */}
        <div
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 sm:h-20 sm:w-20",
            isWinner
              ? "border-green-500 shadow-[0_0_6px_#22c55e,0_0_16px_rgba(34,197,94,0.35)]"
              : "border-transparent",
            isLoser && "opacity-40 grayscale"
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

          {/* Saving overlay */}
          {isSaving && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Loader2 size={20} className="animate-spin text-neon" />
            </div>
          )}
        </div>

        {/* Name */}
        <span className="text-center text-xs font-bold leading-tight text-foreground sm:text-sm">
          {fighter.name}
        </span>

        {/* Result label — winner only */}
        {resultLabel && (
          <span className="text-center text-[10px] font-semibold tracking-wide text-green-500">
            {resultLabel}
          </span>
        )}

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
          className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/80 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm transition-all duration-150 hover:border-neon/60 hover:bg-neon/10 hover:text-neon hover:shadow-neon-sm active:scale-95"
        >
          <BarChart2 size={11} />
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
                {
                  label: "Age",
                  value: fighter.age != null ? `${fighter.age}` : null,
                },
                {
                  label: "Height",
                  value:
                    fighter.height != null ? `${fighter.height} ft` : null,
                },
                {
                  label: "Weight",
                  value:
                    fighter.weight != null ? `${fighter.weight} lbs` : null,
                },
                {
                  label: "Reach",
                  value:
                    fighter.reach != null ? `${fighter.reach}"` : null,
                },
                { label: "Record", value: fighter.record },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-4 py-2.5"
                >
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
  initialIsLocked: boolean;
  eventDate: string | null;
}

export function FightsClient({
  fights,
  initialPicks,
  leagueId,
  initialIsLocked,
  eventDate,
}: FightsClientProps) {
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [picks, setPicks] = useState<PicksMap>(() => {
    const map: PicksMap = {};
    for (const pick of initialPicks) {
      map[pick.fight_id] = pick.picked_fighter_id;
    }
    return map;
  });
  // savingKey = "<fightId>:<fighterId>" while a save is in flight
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main_card: false,
    prelim: false,
    early_prelim: false,
  });
  const [editingSections, setEditingSections] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!eventDate) return;
    const tick = () => {
      const locked = computeIsLocked(eventDate);
      setIsLocked(locked);
      if (locked) setEditingSections({});
    };
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [eventDate]);

  async function handlePick(fightId: string, fighterId: string) {
    if (isLocked || savingKey !== null) return;
    const key = `${fightId}:${fighterId}`;
    const prevPicks = { ...picks };
    // Optimistic update — immediately reflect the pick in UI
    setPicks((prev) => ({ ...prev, [fightId]: fighterId }));
    setSavingKey(key);
    const result = await savePick(leagueId, fightId, fighterId);
    if (result.error) {
      setPicks(prevPicks);
    }
    setSavingKey(null);
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
    <div className="space-y-4">
      {/* ── Controls bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pickedCount} of {fights.length} picks made
        </p>

        {isLocked && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Lock size={11} />
            Picks Locked
          </span>
        )}
      </div>

      {/* ── Fights by category ────────────────────────────────────────────── */}
      {fights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No fights scheduled yet.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {CATEGORY_ORDER.map((cat) => {
            const catFights = groups[cat] ?? [];
            if (catFights.length === 0) return null;
            const isOpen = openSections[cat] ?? false;

            const isEditingCat = editingSections[cat] ?? false;

            return (
              <Collapsible
                key={cat}
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenSections((prev) => ({ ...prev, [cat]: open }))
                }
              >
                {/* ── Section header ───────────────────────────────────── */}
                {/* Card-style row: trigger takes the left, edit button    */}
                {/* is pinned to the right behind a vertical separator.    */}
                <div className="flex overflow-hidden rounded-xl border border-border bg-card transition-colors">
                  <CollapsibleTrigger className="group flex flex-1 cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50 min-w-0">
                    <ChevronDown
                      size={16}
                      className={cn(
                        "shrink-0 transition-transform duration-200",
                        isOpen ? "rotate-180" : "rotate-0",
                        cat === "main_card"
                          ? "text-neon/70"
                          : "text-muted-foreground/70"
                      )}
                    />
                    <h2
                      className={cn(
                        "text-xs font-bold uppercase tracking-widest",
                        cat === "main_card"
                          ? "text-neon drop-shadow-neon-sm"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatCategory(cat)}{" "}
                      <span className="font-normal opacity-60">
                        ({catFights.length})
                      </span>
                    </h2>
                  </CollapsibleTrigger>

                  {/* Edit / Done toggle — separated by a vertical divider  */}
                  {!isLocked && (
                    <>
                      <div className="w-px self-stretch bg-border" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingSections((prev) => ({
                            ...prev,
                            [cat]: !prev[cat],
                          }))
                        }
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 px-4 text-[11px] font-semibold transition-all duration-150 active:scale-95",
                          isEditingCat
                            ? "bg-neon/10 text-neon"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-neon"
                        )}
                    >
                      {isEditingCat ? (
                        <>
                          <Check size={10} />
                          Done
                        </>
                      ) : (
                        <>
                          <Pencil size={10} />
                          Edit
                        </>
                      )}
                    </button>
                  </>
                  )}
                </div>

                {/* ── Fight cards ──────────────────────────────────────── */}
                <CollapsibleContent className="space-y-3 pb-2">
                  {isEditingCat && (
                    <p className="rounded-lg border border-neon/20 bg-neon/5 px-4 py-2 text-center text-xs text-neon/80">
                      Tap a fighter to record your pick
                    </p>
                  )}
                  {catFights.map((fight) => {
                    const f1 = fight.fight_participants.find(
                      (p) => p.corner === "fighter_1"
                    );
                    const f2 = fight.fight_participants.find(
                      (p) => p.corner === "fighter_2"
                    );
                    const pickedFighterId = picks[fight.id];
                    const hasResult = fight.winner_id !== null;
                    const resultLabel = buildResultLabel(fight);
                    const f1IsWinner = hasResult && f1 != null && f1.fighters.id === fight.winner_id;
                    const f2IsWinner = hasResult && f2 != null && f2.fighters.id === fight.winner_id;

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
                              isEditing={isEditingCat}
                              isLocked={isLocked}
                              isSaving={
                                savingKey === `${fight.id}:${f1.fighters.id}`
                              }
                              isWinner={f1IsWinner}
                              isLoser={hasResult && !f1IsWinner}
                              resultLabel={f1IsWinner ? resultLabel : null}
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
                              isEditing={isEditingCat}
                              isLocked={isLocked}
                              isSaving={
                                savingKey === `${fight.id}:${f2.fighters.id}`
                              }
                              isWinner={f2IsWinner}
                              isLoser={hasResult && !f2IsWinner}
                              resultLabel={f2IsWinner ? resultLabel : null}
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

                        {/* Weight class + category label */}
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
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
