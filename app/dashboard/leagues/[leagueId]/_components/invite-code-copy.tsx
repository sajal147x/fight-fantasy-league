"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function InviteCodeCopy({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access denied — silently ignore
    }
  }

  return (
    <div className="flex items-center gap-2">
      <code className="rounded border border-neon/25 bg-neon/5 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-neon">
        {code}
      </code>
      <button
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy invite code"}
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-neon/10 hover:text-neon active:bg-neon/20"
      >
        {copied ? (
          <Check size={14} className="text-neon" />
        ) : (
          <Copy size={14} />
        )}
      </button>
    </div>
  );
}
