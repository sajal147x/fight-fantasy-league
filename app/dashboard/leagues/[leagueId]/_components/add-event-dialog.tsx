"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/app/admin/events/_components/status-badge";
import { addEventToLeagueAction } from "../actions";
import type { EventRow } from "@/lib/db/events";

export function AddEventDialog({
  leagueId,
  availableEvents,
}: {
  leagueId: string;
  availableEvents: EventRow[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Track events added during this dialog session for optimistic removal.
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [didAdd, setDidAdd] = useState(false);

  const visibleEvents = availableEvents.filter((e) => !addedIds.has(e.id));

  function handleOpenChange(next: boolean) {
    if (adding) return; // Block close while an add is in-flight
    if (!next) {
      setError(null);
      if (didAdd) {
        // Refresh server data now that the dialog is closing
        startTransition(() => router.refresh());
        setDidAdd(false);
        setAddedIds(new Set());
      }
    }
    setOpen(next);
  }

  async function handleAdd(eventId: string) {
    setError(null);
    setAdding(eventId);

    const result = await addEventToLeagueAction(leagueId, eventId);

    setAdding(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Optimistically remove this event from the visible list
    setAddedIds((prev) => new Set(prev).add(eventId));
    setDidAdd(true);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2 shadow-neon-sm">
        <Plus size={15} />
        Add Event
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[80dvh] w-[calc(100vw-2rem)] max-w-none flex-col border-border bg-card sm:w-[90vw] sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-foreground">
              Add Event to League
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {error && (
              <p className="mb-3 text-sm text-destructive">{error}</p>
            )}

            {visibleEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <CalendarDays
                  size={32}
                  className="mb-3 text-muted-foreground"
                />
                <p className="text-sm text-muted-foreground">
                  {availableEvents.length === 0
                    ? "No upcoming or live events available to add."
                    : "All available events have been added to this league."}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3 pr-1">
                {visibleEvents.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-col overflow-hidden rounded-lg border border-border bg-background"
                  >
                    {/* Image */}
                    {event.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.image_url}
                        alt={event.name}
                        className="aspect-video w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center bg-muted">
                        <CalendarDays
                          size={24}
                          className="text-muted-foreground"
                        />
                      </div>
                    )}

                    {/* Info + actions */}
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <div>
                        <p className="text-sm font-semibold leading-snug text-foreground">
                          {event.name}
                        </p>
                        {event.date && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(event.date).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </p>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        <StatusBadge status={event.status} />
                        <Button
                          size="sm"
                          disabled={!!adding}
                          onClick={() => handleAdd(event.id)}
                          className="gap-1 shadow-neon-sm"
                        >
                          {adding === event.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Plus size={11} />
                          )}
                          Add
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
