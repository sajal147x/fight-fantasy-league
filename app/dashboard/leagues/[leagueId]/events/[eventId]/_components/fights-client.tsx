"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Lock, Pencil, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { FightWithDetails, FighterDetails, PickRow, LeaguePickEntry } from "@/lib/db/picks";
import { formatWinMethod } from "@/lib/utils/fights";
import { FighterStatsDialog } from "@/components/fights/FighterStatsDialog";

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

// ─── PickAvatar ───────────────────────────────────────────────────────────────

function PickAvatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string | null;
}) {
  return (
    <div className="h-8 w-8 overflow-hidden rounded-full  ">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt="Your pick"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-orange-500">
          {name ? (
            <span className="text-xs font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <User size={14} className="text-white" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── AvatarStack ─────────────────────────────────────────────────────────────

type AvatarEntry = { userId: string; name: string | null; avatarUrl: string | null };

function AvatarStack({ avatars }: { avatars: AvatarEntry[] }) {
  const shown = avatars.slice(0, 3);
  const extra = avatars.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((avatar, i) => (
        <div
          key={avatar.userId}
          title={avatar.name ?? undefined}
          className={cn(
            "h-7 w-7 overflow-hidden rounded-full ring-2 ring-card",
            i > 0 && "-ml-2"
          )}
        >
          {avatar.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar.avatarUrl}
              alt={avatar.name ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-orange-500 text-[10px] font-bold text-white">
              {avatar.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-white ring-2 ring-card">
          <span className="text-[9px] font-bold text-muted-foreground ">
            +{extra}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── FighterBox ───────────────────────────────────────────────────────────────

interface FighterBoxProps {
  fighter: FighterDetails;
  odds: string | null;
  isPicked: boolean;
  isEditing: boolean;
  isLocked: boolean;
  isWinner: boolean;
  isLoser: boolean;
  resultLabel: string | null;
  userAvatarUrl: string | null;
  userName: string | null;
  pickerAvatars: AvatarEntry[];
  onClick: () => void;
}

function FighterBox({
  fighter,
  odds,
  isPicked,
  isEditing,
  isLocked,
  isWinner,
  isLoser,
  resultLabel,
  userAvatarUrl,
  userName,
  pickerAvatars,
  onClick,
}: FighterBoxProps) {
  const isClickable = isEditing && !isLocked;

  return (
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
        "relative flex flex-1 flex-col items-center gap-2 rounded-xl border bg-background p-3 transition-all duration-200",
        "border-border",
        isClickable && "cursor-pointer hover:border-neon/40 hover:bg-neon/5",
        isLocked && "cursor-not-allowed opacity-60"
      )}
    >
      {/* FAV / DOG badge */}
      {odds != null && (
        (() => {
          const isFav = parseFloat(odds) < 0;
          return (
            <span
              className={cn(
                "absolute right-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ring-1",
                isFav
                  ? "bg-green-500/10 text-green-400 ring-green-500/30"
                  : "bg-red-500/10 text-red-400 ring-red-500/30"
              )}
            >
              {isFav ? "FAV" : "DOG"}
            </span>
          );
        })()
      )}

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
      </div>

      {/* Name */}
      <span className="text-center text-xs font-bold leading-tight text-foreground sm:text-sm">
        {fighter.name}
      </span>

      {/* Result label — always reserve space so avatar rows stay aligned */}
      <span
        className={cn(
          "text-center text-[10px] font-semibold tracking-wide",
          resultLabel ? "text-green-500" : "select-none text-transparent"
        )}
      >
        {resultLabel ?? "-"}
      </span>



      {/* Pick indicator — reserved slot so both cards stay the same height */}
      <div className="flex h-8 items-center justify-center">
        {isLocked ? (
          pickerAvatars.length > 0 ? (
            <AvatarStack avatars={pickerAvatars} />
          ) : (
            isPicked && <PickAvatar avatarUrl={userAvatarUrl} name={userName} />
          )
        ) : (
          isPicked && <PickAvatar avatarUrl={userAvatarUrl} name={userName} />
        )}
      </div>
    </div>
  );
}

// ─── FightsClient ─────────────────────────────────────────────────────────────

interface FightsClientProps {
  fights: FightWithDetails[];
  initialPicks: PickRow[];
  initialIsLocked: boolean;
  eventDate: string | null;
  userAvatarUrl: string | null;
  userName: string | null;
  leaguePicks: LeaguePickEntry[];
  onSavePick: (fightId: string, fighterId: string) => Promise<{ error?: string }>;
}

export function FightsClient({
  fights,
  initialPicks,
  initialIsLocked,
  eventDate,
  userAvatarUrl,
  userName,
  leaguePicks,
  onSavePick,
}: FightsClientProps) {
  const [isLocked, setIsLocked] = useState(initialIsLocked);
  const [picks, setPicks] = useState<PicksMap>(() => {
    const map: PicksMap = {};
    for (const pick of initialPicks) {
      map[pick.fight_id] = pick.picked_fighter_id;
    }
    return map;
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    main_card: true,
    prelim: true,
    early_prelim: true,
  });
  const [editingSections, setEditingSections] = useState<
    Record<string, boolean>
  >({});
  const [selectedFight, setSelectedFight] = useState<{
    f1Id: string;
    f2Id: string;
    f1ParticipantId: string;
    f2ParticipantId: string;
  } | null>(null);

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

  function handlePick(fightId: string, fighterId: string) {
    if (isLocked) return;
    const prevPicks = { ...picks };
    // Optimistic: update state instantly
    setPicks((prev) => ({ ...prev, [fightId]: fighterId }));
    // Fire server action in background
    onSavePick(fightId, fighterId)
      .then((result) => {
        if (result?.error) {
          setPicks(prevPicks);
          toast.error("Failed to save pick. Please try again.");
        }
      })
      .catch(() => {
        setPicks(prevPicks);
        toast.error("Failed to save pick. Please try again.");
      });
  }

  // Build map: "fightId:fighterId" → list of pickers (for completed fights)
  const pickersMap = new Map<string, AvatarEntry[]>();
  for (const p of leaguePicks) {
    const key = `${p.fight_id}:${p.picked_fighter_id}`;
    const list = pickersMap.get(key) ?? [];
    list.push({ userId: p.user_id, name: p.user_name, avatarUrl: p.user_avatar_url });
    pickersMap.set(key, list);
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

                  {/* Edit / Done toggle */}
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
                    const f1IsWinner =
                      hasResult && f1 != null && f1.fighters.id === fight.winner_id;
                    const f2IsWinner =
                      hasResult && f2 != null && f2.fighters.id === fight.winner_id;

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
                              isWinner={f1IsWinner}
                              isLoser={hasResult && !f1IsWinner}
                              resultLabel={f1IsWinner ? resultLabel : null}
                              userAvatarUrl={userAvatarUrl}
                              userName={userName}
                              pickerAvatars={pickersMap.get(`${fight.id}:${f1.fighters.id}`) ?? []}
                              onClick={() => handlePick(fight.id, f1.fighters.id)}
                            />
                          ) : (
                            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border py-8 text-xs text-muted-foreground">
                              TBA
                            </div>
                          )}

                          {/* VS divider */}
                          <div className="flex shrink-0 flex-col items-center justify-center gap-2 px-1">
                            <span className="text-base font-black tracking-widest text-muted-foreground/60 sm:text-xl">
                              VS
                            </span>
                            {f1 && f2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedFight({
                                    f1Id: f1.fighters.id,
                                    f2Id: f2.fighters.id,
                                    f1ParticipantId: f1.id,
                                    f2ParticipantId: f2.id,
                                  })
                                }
                                className="rounded bg-neon/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-neon ring-1 ring-neon/40 transition-colors hover:bg-neon/25"
                              >
                                Stats
                              </button>
                            )}
                          </div>

                          {/* Fighter 2 */}
                          {f2 ? (
                            <FighterBox
                              fighter={f2.fighters}
                              odds={f2.odds}
                              isPicked={pickedFighterId === f2.fighters.id}
                              isEditing={isEditingCat}
                              isLocked={isLocked}
                              isWinner={f2IsWinner}
                              isLoser={hasResult && !f2IsWinner}
                              resultLabel={f2IsWinner ? resultLabel : null}
                              userAvatarUrl={userAvatarUrl}
                              userName={userName}
                              pickerAvatars={pickersMap.get(`${fight.id}:${f2.fighters.id}`) ?? []}
                              onClick={() => handlePick(fight.id, f2.fighters.id)}
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

      {selectedFight && (
        <FighterStatsDialog
          fighter1Id={selectedFight.f1Id}
          fighter2Id={selectedFight.f2Id}
          fighter1ParticipantId={selectedFight.f1ParticipantId}
          fighter2ParticipantId={selectedFight.f2ParticipantId}
          open={!!selectedFight}
          onClose={() => setSelectedFight(null)}
        />
      )}
    </div>
  );
}
