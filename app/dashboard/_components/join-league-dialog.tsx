"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
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
import { joinLeagueAction } from "../actions";

export function JoinLeagueDialog() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    if (loading) return;
    if (!next) {
      setCode("");
      setError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await joinLeagueAction(code);

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
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex-1 gap-2 border-border bg-transparent text-foreground hover:border-neon/50 hover:bg-neon/5 hover:text-neon sm:flex-none"
      >
        <LogIn size={15} />
        Join League
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] border-border bg-card sm:w-full sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Join a League</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="invite-code">
                Invite code <span className="text-neon">*</span>
              </Label>
              <Input
                id="invite-code"
                placeholder="e.g. AB12CD"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoFocus
                autoComplete="off"
                className="font-mono tracking-widest uppercase"
              />
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
                disabled={loading || !code.trim()}
                className="w-full gap-2 shadow-neon-sm sm:w-auto"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Joining…" : "Join League"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
