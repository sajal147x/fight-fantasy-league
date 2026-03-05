"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface FighterStatsDialogProps {
  fighter1Id: string;
  fighter2Id: string;
  fighter1ParticipantId: string;
  fighter2ParticipantId: string;
  open: boolean;
  onClose: () => void;
}

// ─── Internal types ───────────────────────────────────────────────────────────

type FighterData = {
  name: string;
  nickname: string | null;
  image_url: string | null;
  age: number | null;
  height: number | null;
  weight: number | null;
  reach: number | null;
  record: string | null;
};

type ParticipantRow = {
  id: string;
  odds: string | null;
  fighters: FighterData;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FighterHeader({
  fighter,
  align,
}: {
  fighter: FighterData;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex flex-1 flex-col items-center gap-1.5 ${align === "left" ? "pr-2" : "pl-2"}`}
    >
      <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-neon/30">
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
      <p className="text-center text-sm font-bold leading-tight text-foreground">
        {fighter.name}
      </p>
      {fighter.nickname && (
        <p className="text-center text-[11px] italic text-muted-foreground">
          &quot;{fighter.nickname}&quot;
        </p>
      )}
    </div>
  );
}

function StatRow({
  label,
  v1,
  v2,
}: {
  label: string;
  v1: string | null;
  v2: string | null;
}) {
  return (
    <div className="grid grid-cols-[1fr_100px_1fr] items-center border-t border-border py-2.5">
      <span className="pr-3 text-right text-sm font-semibold text-foreground">
        {v1 ?? "—"}
      </span>
      <span className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span className="pl-3 text-left text-sm font-semibold text-foreground">
        {v2 ?? "—"}
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      {["Odds", "Record", "Age", "Height", "Weight", "Reach"].map((label) => (
        <div
          key={label}
          className="grid grid-cols-[1fr_100px_1fr] items-center border-t border-border py-2.5"
        >
          <Skeleton className="ml-auto h-4 w-10" />
          <Skeleton className="mx-auto h-3 w-14" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FighterStatsDialog({
  fighter1ParticipantId,
  fighter2ParticipantId,
  open,
  onClose,
}: FighterStatsDialogProps) {
  const [participants, setParticipants] = useState<{
    p1: ParticipantRow;
    p2: ParticipantRow;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setParticipants(null);

    const supabase = createClient();
    supabase
      .from("fight_participants")
      .select(
        "id, odds, fighters ( name, nickname, image_url, age, height, weight, reach, record )"
      )
      .in("id", [fighter1ParticipantId, fighter2ParticipantId])
      .then(({ data, error }) => {
        if (!error && data) {
          const p1 = data.find((r) => r.id === fighter1ParticipantId);
          const p2 = data.find((r) => r.id === fighter2ParticipantId);
          if (p1 && p2) {
            setParticipants({
              p1: p1 as unknown as ParticipantRow,
              p2: p2 as unknown as ParticipantRow,
            });
          }
        }
        setLoading(false);
      });
  }, [open, fighter1ParticipantId, fighter2ParticipantId]);

  const f1 = participants?.p1.fighters ?? null;
  const f2 = participants?.p2.fighters ?? null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xs font-bold uppercase tracking-widest text-neon drop-shadow-neon-sm">
            Tale of the Tape
          </DialogTitle>
        </DialogHeader>

        {loading || !f1 || !f2 ? (
          <LoadingSkeleton />
        ) : (
          <div>
            {/* Fighter images + names */}
            <div className="mb-2 flex items-start justify-between">
              <FighterHeader fighter={f1} align="left" />
              <span className="self-center text-lg font-black text-muted-foreground/40">
                vs
              </span>
              <FighterHeader fighter={f2} align="right" />
            </div>

            {/* Stat rows */}
            <StatRow
              label="Odds"
              v1={participants!.p1.odds != null ? (parseFloat(participants!.p1.odds) > 0 ? `+${participants!.p1.odds}` : participants!.p1.odds) : null}
              v2={participants!.p2.odds != null ? (parseFloat(participants!.p2.odds) > 0 ? `+${participants!.p2.odds}` : participants!.p2.odds) : null}
            />
            <StatRow label="Record" v1={f1.record} v2={f2.record} />
            <StatRow
              label="Age"
              v1={f1.age != null ? String(f1.age) : null}
              v2={f2.age != null ? String(f2.age) : null}
            />
            <StatRow
              label="Height"
              v1={f1.height != null ? `${f1.height} ft` : null}
              v2={f2.height != null ? `${f2.height} ft` : null}
            />
            <StatRow
              label="Weight"
              v1={f1.weight != null ? `${f1.weight} lbs` : null}
              v2={f2.weight != null ? `${f2.weight} lbs` : null}
            />
            <StatRow
              label="Reach"
              v1={f1.reach != null ? `${f1.reach} cm` : null}
              v2={f2.reach != null ? `${f2.reach} cm` : null}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
