"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { addFight, updateFight, deleteFight } from "../actions";
import type { FightRow, FightCategory } from "@/lib/db/fights";
import type { FighterSummary } from "@/lib/db/fighters";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: FightCategory; label: string }[] = [
  { value: "main_card", label: "Main Card" },
  { value: "prelim", label: "Prelim" },
  { value: "early_prelim", label: "Early Prelim" },
];

const CATEGORY_LABEL: Record<FightCategory, string> = {
  main_card: "Main Card",
  prelim: "Prelim",
  early_prelim: "Early Prelim",
};

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "live", label: "Live" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const WIN_METHODS = [
  { value: "ko_tko", label: "KO/TKO" },
  { value: "submission", label: "Submission" },
  { value: "decision_unanimous", label: "Decision - Unanimous" },
  { value: "decision_split", label: "Decision - Split" },
  { value: "decision_majority", label: "Decision - Majority" },
];

// ─── Form types ───────────────────────────────────────────────────────────────

type AddFormState = {
  fighter1Id: string;
  fighter2Id: string;
  weightClass: string;
  category: FightCategory;
  boutOrder: string;
};

const EMPTY_ADD_FORM: AddFormState = {
  fighter1Id: "",
  fighter2Id: "",
  weightClass: "",
  category: "main_card",
  boutOrder: "1",
};

type EditFormState = {
  fighter1Id: string;
  fighter2Id: string;
  weightClass: string;
  category: FightCategory;
  boutOrder: string;
  status: string;
  // "" = none; "none" sentinel used only within Select value prop
  winnerId: string;
  winMethod: string;
  round: string;
  time: string;
  fighter1Odds: string;
  fighter2Odds: string;
};

function fightToEditForm(fight: FightRow): EditFormState {
  const f1p = fight.fight_participants.find((p) => p.corner === "fighter_1");
  const f2p = fight.fight_participants.find((p) => p.corner === "fighter_2");
  return {
    fighter1Id: f1p?.fighters.id ?? "",
    fighter2Id: f2p?.fighters.id ?? "",
    weightClass: fight.weight_class ?? "",
    category: fight.category as FightCategory,
    boutOrder: String(fight.bout_order),
    status: fight.status ?? "scheduled",
    winnerId: fight.winner_id ?? "",
    winMethod: fight.win_method ?? "",
    round: fight.round != null ? String(fight.round) : "",
    time: fight.time ?? "",
    fighter1Odds: f1p?.odds != null ? String(f1p.odds) : "",
    fighter2Odds: f2p?.odds != null ? String(f2p.odds) : "",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParticipant(fight: FightRow, slot: "fighter_1" | "fighter_2") {
  return fight.fight_participants.find((p) => p.corner === slot)?.fighters ?? null;
}

function FighterCell({ fighter }: { fighter: ReturnType<typeof getParticipant> }) {
  if (!fighter) return <span className="text-muted-foreground">TBD</span>;

  const stats = [
    fighter.age != null && `${fighter.age}y`,
    fighter.height != null && `${fighter.height}ft`,
    fighter.weight != null && `${fighter.weight}lbs`,
    fighter.reach != null && `${fighter.reach}" reach`,
    fighter.record,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <div className="font-medium text-foreground">{fighter.name}</div>
      {stats && <div className="text-xs text-muted-foreground">{stats}</div>}
    </div>
  );
}

// ─── Fighter Combobox ─────────────────────────────────────────────────────────

function FighterCombobox({
  fighters,
  value,
  onChange,
  placeholder,
  excludeId,
}: {
  fighters: FighterSummary[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  excludeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = fighters.find((f) => f.id === value) ?? null;
  const available = fighters.filter((f) => f.id !== excludeId);

  return (
    // modal={false} prevents Popover from conflicting with Dialog's focus trap
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
            "bg-input",
            open ? "border-ring" : "border-input hover:border-ring/50",
            selected ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {selected ? (
              <>
                {selected.name}
                {selected.nickname && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    &ldquo;{selected.nickname}&rdquo;
                  </span>
                )}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown size={13} className="ml-2 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] border-border bg-card p-0"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search fighters…"
            className="border-b border-border text-foreground placeholder:text-muted-foreground"
          />
          <CommandList className="max-h-52">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
              No fighters found.
            </CommandEmpty>
            <CommandGroup>
              {available.map((f) => (
                <CommandItem
                  key={f.id}
                  value={`${f.name} ${f.nickname ?? ""}`}
                  onSelect={() => {
                    onChange(f.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer text-foreground data-[selected=true]:bg-neon/10 data-[selected=true]:text-neon"
                >
                  <Check
                    size={13}
                    className={cn(
                      "mr-2 shrink-0 text-neon",
                      value === f.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{f.name}</span>
                  {f.nickname && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      &ldquo;{f.nickname}&rdquo;
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Fight status badge ───────────────────────────────────────────────────────

function FightStatusBadge({ status }: { status: string | null }) {
  if (!status || status === "scheduled") {
    return (
      <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground">
        Scheduled
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neon/10 px-2 py-0.5 text-xs font-semibold text-neon">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
      {status}
    </span>
  );
}

// ─── Shared select styling ────────────────────────────────────────────────────

const selectTriggerCls = "border-input bg-input text-foreground focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
const selectContentCls = "border-border bg-card text-foreground";
const selectItemCls = "focus:bg-neon/10 focus:text-neon";

// ─── Main component ───────────────────────────────────────────────────────────

export function FightsTable({
  eventId,
  fights,
  fighters,
}: {
  eventId: string;
  fights: FightRow[];
  fighters: FighterSummary[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // ── Add dialog ──────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(EMPTY_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  function setAddField<K extends keyof AddFormState>(k: K, v: AddFormState[K]) {
    setAddForm((p) => ({ ...p, [k]: v }));
  }

  function openAdd() {
    setAddForm(EMPTY_ADD_FORM);
    setAddError(null);
    setAddOpen(true);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!addForm.fighter1Id || !addForm.fighter2Id) {
      setAddError("Please select both fighters.");
      return;
    }
    if (addForm.fighter1Id === addForm.fighter2Id) {
      setAddError("The same fighter cannot be selected twice.");
      return;
    }
    const boutOrder = parseInt(addForm.boutOrder, 10);
    if (!boutOrder || boutOrder < 1) {
      setAddError("Bout order must be a positive number.");
      return;
    }

    setAddLoading(true);
    const result = await addFight({
      eventId,
      fighter1Id: addForm.fighter1Id,
      fighter2Id: addForm.fighter2Id,
      weightClass: addForm.weightClass.trim() || null,
      category: addForm.category,
      boutOrder,
    });
    setAddLoading(false);

    if (result.error) { setAddError(result.error); return; }
    setAddOpen(false);
    startTransition(() => router.push(pathname));
  }

  // ── Edit dialog ─────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FightRow | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(fightToEditForm({
    id: "", bout_order: 1, weight_class: null, category: "main_card",
    status: "scheduled", winner_id: null, win_method: null, round: null,
    time: null, fight_participants: [],
  }));
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  function setEditField<K extends keyof EditFormState>(k: K, v: EditFormState[K]) {
    setEditForm((p) => ({ ...p, [k]: v }));
  }

  function openEdit(fight: FightRow) {
    setEditTarget(fight);
    setEditForm(fightToEditForm(fight));
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditStatusChange(newStatus: string) {
    setEditForm((p) =>
      newStatus !== "completed"
        ? { ...p, status: newStatus, winnerId: "", winMethod: "", round: "", time: "" }
        : { ...p, status: newStatus }
    );
  }

  function handleEditWinnerChange(winnerId: string) {
    setEditForm((p) =>
      !winnerId
        ? { ...p, winnerId: "", winMethod: "", round: "", time: "" }
        : { ...p, winnerId }
    );
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEditError(null);

    if (!editForm.fighter1Id || !editForm.fighter2Id) {
      setEditError("Please select both fighters.");
      return;
    }
    if (editForm.fighter1Id === editForm.fighter2Id) {
      setEditError("The same fighter cannot be selected twice.");
      return;
    }
    const boutOrder = parseInt(editForm.boutOrder, 10);
    if (!boutOrder || boutOrder < 1) {
      setEditError("Bout order must be a positive number.");
      return;
    }

    setEditLoading(true);
    const result = await updateFight(editTarget!.id, eventId, {
      fighter1Id: editForm.fighter1Id,
      fighter2Id: editForm.fighter2Id,
      weightClass: editForm.weightClass.trim() || null,
      category: editForm.category,
      boutOrder,
      status: editForm.status,
      winnerId: editForm.winnerId || null,
      winMethod: editForm.winMethod || null,
      round: editForm.round ? parseInt(editForm.round, 10) : null,
      time: editForm.time.trim() || null,
      fighter1Odds: editForm.fighter1Odds.trim() || null,
      fighter2Odds: editForm.fighter2Odds.trim() || null,
    });
    setEditLoading(false);

    if (result.error) { setEditError(result.error); return; }
    setEditOpen(false);
    startTransition(() => router.push(pathname));
  }

  // ── Delete dialog ───────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<FightRow | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteFight(deleteTarget.id, eventId);
    setDeleteTarget(null);
    if (!result.error) startTransition(() => router.push(pathname));
  }

  // ── Derived values for edit winner dropdown ─────────────────────────────────
  const editF1 = fighters.find((f) => f.id === editForm.fighter1Id) ?? null;
  const editF2 = fighters.find((f) => f.id === editForm.fighter2Id) ?? null;

  return (
    <>
      {/* ── Add button ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={openAdd} className="w-full gap-2 shadow-neon-sm sm:w-auto">
          <Plus size={15} />
          Add Fight
        </Button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border border-border">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              {[
                { label: "#", cls: "w-12" },
                { label: "Fighter 1", cls: "" },
                { label: "Fighter 2", cls: "" },
                { label: "Weight Class", cls: "hidden md:table-cell" },
                { label: "Category", cls: "hidden lg:table-cell" },
                { label: "Status", cls: "" },
                { label: "Actions", cls: "w-[88px]" },
              ].map(({ label, cls }) => (
                <TableHead
                  key={label}
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    cls
                  )}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {fights.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No fights yet.{" "}
                  <button
                    onClick={openAdd}
                    className="text-neon underline underline-offset-4 hover:drop-shadow-neon-sm"
                  >
                    Add the first one.
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              fights.map((fight) => {
                const f1 = getParticipant(fight, "fighter_1");
                const f2 = getParticipant(fight, "fighter_2");
                return (
                  <TableRow
                    key={fight.id}
                    className={cn(
                      "border-border transition-colors",
                      isPending ? "opacity-60" : "hover:bg-neon/[0.04]"
                    )}
                  >
                    <TableCell className="font-mono text-sm font-bold text-neon">
                      {fight.bout_order}
                    </TableCell>
                    <TableCell><FighterCell fighter={f1} /></TableCell>
                    <TableCell><FighterCell fighter={f2} /></TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {fight.weight_class ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {CATEGORY_LABEL[fight.category as FightCategory] ?? fight.category}
                    </TableCell>
                    <TableCell>
                      <FightStatusBadge status={fight.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => openEdit(fight)}
                          className="rounded p-2.5 text-muted-foreground transition-colors hover:bg-neon/10 hover:text-neon active:bg-neon/20"
                          aria-label="Edit fight"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(fight)}
                          className="rounded p-2.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                          aria-label="Delete fight"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add Fight Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(o) => !addLoading && setAddOpen(o)}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-y-auto border-border bg-card sm:w-full sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">Add Fight</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="flex flex-col gap-4 pt-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fighter 1 <span className="text-neon">*</span></Label>
                <FighterCombobox
                  fighters={fighters}
                  value={addForm.fighter1Id}
                  onChange={(id) => setAddField("fighter1Id", id)}
                  placeholder="Select fighter…"
                  excludeId={addForm.fighter2Id}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fighter 2 <span className="text-neon">*</span></Label>
                <FighterCombobox
                  fighters={fighters}
                  value={addForm.fighter2Id}
                  onChange={(id) => setAddField("fighter2Id", id)}
                  placeholder="Select fighter…"
                  excludeId={addForm.fighter1Id}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="a-weight">Weight Class</Label>
                <Input
                  id="a-weight"
                  placeholder="Lightweight"
                  value={addForm.weightClass}
                  onChange={(e) => setAddField("weightClass", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-order">
                  Bout Order <span className="text-neon">*</span>
                </Label>
                <Input
                  id="a-order"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={addForm.boutOrder}
                  onChange={(e) => setAddField("boutOrder", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={addForm.category}
                onValueChange={(v) => setAddField("category", v as FightCategory)}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  {CATEGORIES.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className={selectItemCls}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addError && <p className="text-sm text-destructive">{addError}</p>}

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                disabled={addLoading}
                onClick={() => setAddOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addLoading}
                className="w-full gap-2 shadow-neon-sm sm:w-auto"
              >
                {addLoading && <Loader2 size={14} className="animate-spin" />}
                {addLoading ? "Adding…" : "Add Fight"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Fight Dialog ────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(o) => !editLoading && setEditOpen(o)}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-y-auto border-border bg-card sm:w-full sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">Edit Fight</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 pt-1">
            {/* Fighters */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Fighter 1 <span className="text-neon">*</span></Label>
                <FighterCombobox
                  fighters={fighters}
                  value={editForm.fighter1Id}
                  onChange={(id) => setEditField("fighter1Id", id)}
                  placeholder="Select fighter…"
                  excludeId={editForm.fighter2Id}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fighter 2 <span className="text-neon">*</span></Label>
                <FighterCombobox
                  fighters={fighters}
                  value={editForm.fighter2Id}
                  onChange={(id) => setEditField("fighter2Id", id)}
                  placeholder="Select fighter…"
                  excludeId={editForm.fighter1Id}
                />
              </div>
            </div>

            {/* Odds */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-odds1">Fighter 1 Odds</Label>
                <Input
                  id="e-odds1"
                  type="number"
                  placeholder="-150"
                  value={editForm.fighter1Odds}
                  onChange={(e) => setEditField("fighter1Odds", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-odds2">Fighter 2 Odds</Label>
                <Input
                  id="e-odds2"
                  type="number"
                  placeholder="+220"
                  value={editForm.fighter2Odds}
                  onChange={(e) => setEditField("fighter2Odds", e.target.value)}
                />
              </div>
            </div>

            {/* Weight class + bout order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-weight">Weight Class</Label>
                <Input
                  id="e-weight"
                  placeholder="Lightweight"
                  value={editForm.weightClass}
                  onChange={(e) => setEditField("weightClass", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-order">
                  Bout Order <span className="text-neon">*</span>
                </Label>
                <Input
                  id="e-order"
                  type="number"
                  min={1}
                  value={editForm.boutOrder}
                  onChange={(e) => setEditField("boutOrder", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Category + status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(v) => setEditField("category", v as FightCategory)}
                >
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {CATEGORIES.map(({ value, label }) => (
                      <SelectItem key={value} value={value} className={selectItemCls}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={handleEditStatusChange}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {STATUSES.map(({ value, label }) => (
                      <SelectItem key={value} value={value} className={selectItemCls}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Result divider ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Result
              </span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Winner */}
            <div className="space-y-1.5">
              <Label>Winner</Label>
              <Select
                value={editForm.winnerId || "none"}
                onValueChange={(v) => handleEditWinnerChange(v === "none" ? "" : v)}
                disabled={editForm.status !== "completed"}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="— No winner —" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="none" className={selectItemCls}>
                    — No winner —
                  </SelectItem>
                  {editF1 && (
                    <SelectItem value={editF1.id} className={selectItemCls}>
                      {editF1.name}
                      <span className="ml-1.5 text-xs opacity-60">(Fighter 1)</span>
                    </SelectItem>
                  )}
                  {editF2 && (
                    <SelectItem value={editF2.id} className={selectItemCls}>
                      {editF2.name}
                      <span className="ml-1.5 text-xs opacity-60">(Fighter 2)</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Win method */}
            <div className="space-y-1.5">
              <Label>Win Method</Label>
              <Select
                value={editForm.winMethod || "none"}
                onValueChange={(v) => setEditField("winMethod", v === "none" ? "" : v)}
                disabled={!editForm.winnerId}
              >
                <SelectTrigger className={selectTriggerCls}>
                  <SelectValue placeholder="— Select method —" />
                </SelectTrigger>
                <SelectContent className={selectContentCls}>
                  <SelectItem value="none" className={selectItemCls}>
                    — Select method —
                  </SelectItem>
                  {WIN_METHODS.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className={selectItemCls}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Round + time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-round">Round</Label>
                <Input
                  id="e-round"
                  type="number"
                  min={1}
                  max={5}
                  placeholder="1–5"
                  value={editForm.round}
                  onChange={(e) => setEditField("round", e.target.value)}
                  disabled={!editForm.winnerId}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-time">Time</Label>
                <Input
                  id="e-time"
                  placeholder="4:32"
                  value={editForm.time}
                  onChange={(e) => setEditField("time", e.target.value)}
                  disabled={!editForm.winnerId}
                />
              </div>
            </div>

            {editError && <p className="text-sm text-destructive">{editError}</p>}

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                disabled={editLoading}
                onClick={() => setEditOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editLoading}
                className="w-full gap-2 shadow-neon-sm sm:w-auto"
              >
                {editLoading && <Loader2 size={14} className="animate-spin" />}
                {editLoading ? "Saving…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] border-border bg-card sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete this fight?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteTarget && (
                <>
                  <span className="text-foreground">
                    {getParticipant(deleteTarget, "fighter_1")?.name ?? "TBD"}
                  </span>
                  {" vs "}
                  <span className="text-foreground">
                    {getParticipant(deleteTarget, "fighter_2")?.name ?? "TBD"}
                  </span>
                  {" — "}
                </>
              )}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel className="w-full border-border sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/80 sm:w-auto"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
