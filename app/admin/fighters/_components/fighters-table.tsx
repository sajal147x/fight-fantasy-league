"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Pencil, Trash2, Plus, Loader2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

import { addFighter, updateFighter, deleteFighter, saveFighterImage } from "../actions";
import type { FighterRow } from "@/lib/db/fighters";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  nickname: string;
  nationality: string;
  date_of_birth: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  nickname: "",
  nationality: "",
  date_of_birth: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a YYYY-MM-DD string as "14 Jul 1988" with no timezone drift. */
function formatDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function FighterAvatar({
  src,
  name,
  size = "sm",
}: {
  src: string | null;
  name: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "h-16 w-16" : "h-7 w-7";
  const textCls = size === "lg" ? "text-lg" : "text-xs";
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border",
        dim
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className={cn(
            "flex h-full w-full items-center justify-center font-bold text-muted-foreground",
            textCls
          )}
        >
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FightersTable({ fighters }: { fighters: FighterRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FighterRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // Incrementing this key forces the <Input type="file"> to remount, clearing
  // any previously selected file when the dialog is reopened.
  const [imageInputKey, setImageInputKey] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState<FighterRow | null>(null);

  function resetImageState(existingUrl: string | null = null) {
    // Revoke any outstanding object URL to prevent memory leaks
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(existingUrl);
    setImageInputKey((k) => k + 1);
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    resetImageState(null);
    setDialogOpen(true);
  }

  function openEdit(fighter: FighterRow) {
    setEditing(fighter);
    setForm({
      name: fighter.name,
      nickname: fighter.nickname ?? "",
      nationality: fighter.nationality ?? "",
      date_of_birth: fighter.date_of_birth ?? "",
    });
    setFormError(null);
    resetImageState(fighter.image_url);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    if (formLoading) return;
    if (!open) resetImageState(null);
    setDialogOpen(open);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    // Revoke the previous blob URL before creating a new one
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : (editing?.image_url ?? null));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const payload = {
      name: form.name,
      nickname: form.nickname.trim() || null,
      nationality: form.nationality.trim() || null,
      date_of_birth: form.date_of_birth || null,
    };

    const result = editing
      ? await updateFighter(editing.id, payload)
      : await addFighter(payload);

    if (result.error) {
      setFormError(result.error);
      setFormLoading(false);
      return;
    }

    // Upload image if a new file was selected
    if (imageFile) {
      const fighterId = editing ? editing.id : (result as { id: string }).id;
      const fd = new FormData();
      fd.append("fighterId", fighterId);
      fd.append("image", imageFile);
      const uploadResult = await saveFighterImage(fd);
      if (uploadResult?.error) {
        // Image upload failed — fighter was saved but without photo.
        // Surface the error non-blocking so the user can retry.
        setFormError(`Fighter saved, but image upload failed: ${uploadResult.error}`);
        setFormLoading(false);
        startTransition(() => router.push(pathname));
        return;
      }
    }

    setFormLoading(false);
    setDialogOpen(false);
    startTransition(() => router.push(pathname));
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteFighter(deleteTarget.id);
    setDeleteTarget(null);
    if (!result.error) startTransition(() => router.push(pathname));
  }

  const isAdding = !editing;

  return (
    <>
      {/* ── Add button ─────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <Button onClick={openAdd} className="w-full gap-2 shadow-neon-sm sm:w-auto">
          <Plus size={15} />
          Add Fighter
        </Button>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-md border border-border">
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                Nickname
              </TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                Nationality
              </TableHead>
              <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                Date of Birth
              </TableHead>
              <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {fighters.length === 0 ? (
              <TableRow className="border-border hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="py-12 text-center text-sm text-muted-foreground"
                >
                  No fighters yet.{" "}
                  <button
                    onClick={openAdd}
                    className="text-neon underline underline-offset-4 hover:drop-shadow-neon-sm"
                  >
                    Add the first one.
                  </button>
                </TableCell>
              </TableRow>
            ) : (
              fighters.map((fighter) => (
                <TableRow
                  key={fighter.id}
                  className={cn(
                    "border-border transition-colors",
                    isPending ? "opacity-60" : "hover:bg-neon/[0.04]"
                  )}
                >
                  <TableCell className="font-semibold text-foreground">
                    <div className="flex items-center gap-2.5">
                      <FighterAvatar src={fighter.image_url} name={fighter.name} />
                      {fighter.name}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {fighter.nickname ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {fighter.nationality ?? "—"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDate(fighter.date_of_birth)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(fighter)}
                        className="rounded p-3 text-muted-foreground transition-colors hover:bg-neon/10 hover:text-neon active:bg-neon/20"
                        aria-label={`Edit ${fighter.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(fighter)}
                        className="rounded p-3 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive active:bg-destructive/20"
                        aria-label={`Delete ${fighter.name}`}
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

      {/* ── Add / Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col overflow-y-auto border-border bg-card sm:w-full sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">
              {isAdding ? "Add Fighter" : "Edit Fighter"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            {/* Photo */}
            <div className="space-y-1.5">
              <Label htmlFor="f-image">Photo</Label>
              <div className="flex items-center gap-3">
                {/* Live preview */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <UserCircle size={28} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Input
                  key={imageInputKey}
                  id="f-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="cursor-pointer file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-neon/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-neon hover:file:bg-neon/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-name">
                Name <span className="text-neon">*</span>
              </Label>
              <Input
                id="f-name"
                placeholder="Conor McGregor"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-nickname">Nickname</Label>
              <Input
                id="f-nickname"
                placeholder="The Notorious"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-nationality">Nationality</Label>
              <Input
                id="f-nationality"
                placeholder="Irish"
                value={form.nationality}
                onChange={(e) =>
                  setForm({ ...form, nationality: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="f-dob">Date of Birth</Label>
              <Input
                id="f-dob"
                type="date"
                value={form.date_of_birth}
                onChange={(e) =>
                  setForm({ ...form, date_of_birth: e.target.value })
                }
                className="[color-scheme:dark]"
              />
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
                  : isAdding ? "Add Fighter" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────────────────────── */}
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
              This will permanently remove the fighter. This action cannot be
              undone.
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
