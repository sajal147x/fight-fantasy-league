"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLeagueAction } from "../actions";
import type { ScoringRulesetSummary } from "@/lib/db/leagues";

export function CreateLeagueDialog({
  rulesets,
}: {
  rulesets: ScoringRulesetSummary[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [rulesetId, setRulesetId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) {
      setName("");
      setRulesetId("");
      setError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await createLeagueAction({
      name: name.trim(),
      scoring_ruleset_id: rulesetId || null,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="flex-1 gap-2 shadow-neon-sm sm:flex-none">
        <Plus size={15} />
        Create League
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border bg-card sm:w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create League</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            {/* League name */}
            <div className="space-y-1.5">
              <Label htmlFor="league-name">
                League name <span className="text-neon">*</span>
              </Label>
              <Input
                id="league-name"
                placeholder="e.g. Octagon Warriors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            {/* Scoring ruleset */}
            <div className="space-y-1.5">
              <Label htmlFor="league-ruleset">Scoring ruleset</Label>
              {rulesets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No rulesets configured yet.
                </p>
              ) : (
                <Select value={rulesetId} onValueChange={setRulesetId}>
                  <SelectTrigger
                    id="league-ruleset"
                    className="border-input bg-input text-foreground focus:ring-ring"
                  >
                    <SelectValue placeholder="Choose a ruleset (optional)" />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-foreground">
                    {rulesets.map((r) => (
                      <SelectItem
                        key={r.id}
                        value={r.id}
                        className="focus:bg-neon/10 focus:text-neon"
                      >
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full gap-2 shadow-neon-sm sm:w-auto"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Creating…" : "Create League"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
