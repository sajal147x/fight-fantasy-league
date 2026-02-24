"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
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

import { addEvent, updateEvent, deleteEvent, type EventStatus } from "../actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Event = {
  id: string;
  name: string;
  type: string | null;
  date: string | null;
  venue: string | null;
  location: string | null;
  status: EventStatus;
};

type FormState = {
  name: string;
  type: string;
  date: string;
  venue: string;
  location: string;
  status: EventStatus;
};

const EMPTY_FORM: FormState = {
  name: "",
  type: "",
  date: "",
  venue: "",
  location: "",
  status: "upcoming",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format an ISO datetime string for display, e.g. "14 Jul 2024 · 20:00".
 * Uses UTC so the value matches what was stored.
 */
function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${date} · ${time}`;
}

/**
 * Convert an ISO datetime to the "YYYY-MM-DDTHH:mm" format required by
 * <input type="datetime-local">.
 */
function toDateTimeLocal(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 16);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neon/10 px-2.5 py-1 text-xs font-semibold text-neon">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon" />
        Live
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-foreground">
      Upcoming
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventsTable({ events }: { events: Event[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(event: Event) {
    setEditing(event);
    setForm({
      name: event.name,
      type: event.type ?? "",
      date: toDateTimeLocal(event.date),
      venue: event.venue ?? "",
      location: event.location ?? "",
      status: event.status,
    });
    setFormError(null);
    setDialogOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const payload = {
      name: form.name,
      type: form.type.trim() || null,
      // Append seconds so the value is a valid ISO 8601 timestamp
      date: form.date ? `${form.date}:00` : null,
      venue: form.venue.trim() || null,
      location: form.location.trim() || null,
      status: form.status,
    };

    const result = editing
      ? await updateEvent(editing.id, payload)
      : await addEvent(payload);

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
    const result = await deleteEvent(deleteTarget.id);
    setDeleteTarget(null);
    if (!result.error) startTransition(() => router.push(pathname));
  }

  const isAdding = !editing;

  return (
    <>
      {/* ── Add button ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={openAdd} className="w-full gap-2 shadow-neon-sm sm:w-auto">
          <Plus size={15} />
          Add Event
        </Button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border border-border">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                Type
              </TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                Date / Time
              </TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                Venue
              </TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                Location
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {events.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={7}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No events yet.{" "}
                  <button
                    onClick={openAdd}
                    className="text-neon underline underline-offset-4 hover:drop-shadow-neon-sm"
                  >
                    Add the first one.
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow
                  key={event.id}
                  className={cn(
                    "border-border transition-colors",
                    isPending ? "opacity-60" : "hover:bg-neon/[0.04]"
                  )}
                >
                  <TableCell className="font-semibold text-foreground">
                    {event.name}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {event.type ?? "—"}
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                    {formatDateTime(event.date)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {event.venue ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {event.location ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={event.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(event)}
                        className="rounded p-3 text-muted-foreground transition-colors hover:bg-neon/10 hover:text-neon active:bg-neon/20"
                        aria-label={`Edit ${event.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(event)}
                        className="rounded p-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                        aria-label={`Delete ${event.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => !formLoading && setDialogOpen(o)}
      >
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-y-auto border-border bg-card sm:w-full sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">
              {isAdding ? "Add Event" : "Edit Event"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="ev-name">
                Name <span className="text-neon">*</span>
              </Label>
              <Input
                id="ev-name"
                placeholder="UFC 300"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label htmlFor="ev-type">Type</Label>
              <Input
                id="ev-type"
                placeholder="UFC PPV"
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
              />
            </div>

            {/* Date / Time */}
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date &amp; Time</Label>
              <Input
                id="ev-date"
                type="datetime-local"
                value={form.date}
                onChange={(e) => setField("date", e.target.value)}
                className="[color-scheme:dark]"
              />
            </div>

            {/* Venue + Location — side by side on sm+ */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-venue">Venue</Label>
                <Input
                  id="ev-venue"
                  placeholder="T-Mobile Arena"
                  value={form.venue}
                  onChange={(e) => setField("venue", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-location">Location</Label>
                <Input
                  id="ev-location"
                  placeholder="Las Vegas, NV"
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label htmlFor="ev-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v as EventStatus)}
              >
                <SelectTrigger
                  id="ev-status"
                  className="border-input bg-input text-foreground focus:ring-ring"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  <SelectItem
                    value="upcoming"
                    className="focus:bg-neon/10 focus:text-neon"
                  >
                    Upcoming
                  </SelectItem>
                  <SelectItem
                    value="live"
                    className="focus:bg-neon/10 focus:text-neon"
                  >
                    Live
                  </SelectItem>
                  <SelectItem
                    value="completed"
                    className="focus:bg-neon/10 focus:text-neon"
                  >
                    Completed
                  </SelectItem>
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
                {formLoading
                  ? isAdding ? "Adding…" : "Saving…"
                  : isAdding ? "Add Event" : "Save Changes"}
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
              Delete{" "}
              <span className="text-neon">{deleteTarget?.name}</span>?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently remove the event and cannot be undone.
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
