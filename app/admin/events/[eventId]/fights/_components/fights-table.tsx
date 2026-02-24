"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Plus, Trash2, Loader2, ChevronsUpDown, Check } from "lucide-react";
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

import { addFight, deleteFight, type FightCategory } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Fighter = {
  id: string;
  name: string;
  nickname: string | null;
};

type FightParticipant = {
  corner: "fighter_1" | "fighter_2";
  fighters: Fighter;
};

export type FightRow = {
  id: string;
  bout_order: number;
  weight_class: string | null;
  category: string;
  status: string | null;
  fight_participants: FightParticipant[];
};

type FormState = {
  fighter1Id: string;
  fighter2Id: string;
  weightClass: string;
  category: FightCategory;
  boutOrder: string;
};

const EMPTY_FORM: FormState = {
  fighter1Id: "",
  fighter2Id: "",
  weightClass: "",
  category: "main_card",
  boutOrder: "1",
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParticipant(
  fight: FightRow,
  slot: "fighter_1" | "fighter_2"
): Fighter | null {
  return fight.fight_participants.find((p) => p.corner === slot)?.fighters ?? null;
}

// ─── Fighter Combobox ─────────────────────────────────────────────────────────

function FighterCombobox({
  fighters,
  value,
  onChange,
  placeholder,
  excludeId,
}: {
  fighters: Fighter[];
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

// ─── Main component ───────────────────────────────────────────────────────────

export function FightsTable({
  eventId,
  fights,
  fighters,
}: {
  eventId: string;
  fights: FightRow[];
  fighters: Fighter[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FightRow | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.fighter1Id || !form.fighter2Id) {
      setFormError("Please select both fighters.");
      return;
    }
    if (form.fighter1Id === form.fighter2Id) {
      setFormError("The same fighter cannot be selected twice.");
      return;
    }
    const boutOrder = parseInt(form.boutOrder, 10);
    if (!boutOrder || boutOrder < 1) {
      setFormError("Bout order must be a positive number.");
      return;
    }

    setFormLoading(true);
    const result = await addFight({
      eventId,
      fighter1Id: form.fighter1Id,
      fighter2Id: form.fighter2Id,
      weightClass: form.weightClass.trim() || null,
      category: form.category,
      boutOrder,
    });
    setFormLoading(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    setDialogOpen(false);
    startTransition(() => router.push(pathname));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteFight(deleteTarget.id, eventId);
    setDeleteTarget(null);
    if (!result.error) startTransition(() => router.push(pathname));
  }

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
                { label: "Actions", cls: "w-[60px]" },
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
                    <TableCell className="font-medium text-foreground">
                      {f1?.name ?? <span className="text-muted-foreground">TBD</span>}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {f2?.name ?? <span className="text-muted-foreground">TBD</span>}
                    </TableCell>
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
                      <button
                        onClick={() => setDeleteTarget(fight)}
                        className="rounded p-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                        aria-label="Delete fight"
                      >
                        <Trash2 size={14} />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add Fight Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !formLoading && setDialogOpen(o)}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-y-auto border-border bg-card sm:w-full sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">Add Fight</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            {/* Fighters — side by side on sm+ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Fighter 1 <span className="text-neon">*</span>
                </Label>
                <FighterCombobox
                  fighters={fighters}
                  value={form.fighter1Id}
                  onChange={(id) => setField("fighter1Id", id)}
                  placeholder="Select fighter…"
                  excludeId={form.fighter2Id}
                />
              </div>

              <div className="space-y-1.5">
                <Label>
                  Fighter 2 <span className="text-neon">*</span>
                </Label>
                <FighterCombobox
                  fighters={fighters}
                  value={form.fighter2Id}
                  onChange={(id) => setField("fighter2Id", id)}
                  placeholder="Select fighter…"
                  excludeId={form.fighter1Id}
                />
              </div>
            </div>

            {/* Weight class + Bout order — side by side on sm+ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-weight">Weight Class</Label>
                <Input
                  id="f-weight"
                  placeholder="Lightweight"
                  value={form.weightClass}
                  onChange={(e) => setField("weightClass", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-order">
                  Bout Order <span className="text-neon">*</span>
                </Label>
                <Input
                  id="f-order"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={form.boutOrder}
                  onChange={(e) => setField("boutOrder", e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="f-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setField("category", v as FightCategory)}
              >
                <SelectTrigger
                  id="f-category"
                  className="border-input bg-input text-foreground focus:ring-ring"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  {CATEGORIES.map(({ value, label }) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="focus:bg-neon/10 focus:text-neon"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}

            <DialogFooter className="shrink-0 flex-col-reverse gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                disabled={formLoading}
                onClick={() => setDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="w-full gap-2 shadow-neon-sm sm:w-auto"
              >
                {formLoading && <Loader2 size={14} className="animate-spin" />}
                {formLoading ? "Adding…" : "Add Fight"}
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
