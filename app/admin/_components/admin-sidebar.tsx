"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AdminNav } from "./admin-nav";

function SidebarContent({ email }: { email: string }) {
  return (
    <div className="flex h-full flex-col bg-[#080808]">
      {/* Brand */}
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <span className="text-lg font-extrabold tracking-tight text-neon drop-shadow-neon">
          FFL
        </span>
        <span className="text-sm font-semibold text-muted-foreground">
          Admin
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4">
        <AdminNav />
      </div>

      {/* Email */}
      <div className="border-t border-border px-5 py-3">
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}

export function AdminSidebar({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the sheet whenever the route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* ── Desktop: permanent sidebar ── */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border md:flex">
        <SidebarContent email={email} />
      </aside>

      {/* ── Mobile: sticky top bar + slide-in Sheet ── */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-[#080808] px-4 py-3 md:hidden">
        <span className="font-extrabold tracking-tight">
          <span className="text-neon drop-shadow-neon-sm">FFL</span>
          <span className="ml-1.5 text-xs font-semibold text-muted-foreground">
            Admin
          </span>
        </span>

        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2.5 text-muted-foreground transition-colors hover:bg-neon/10 hover:text-neon active:bg-neon/20"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            className="w-64 border-r border-border bg-[#080808] p-0 [&>button]:right-4 [&>button]:top-4 [&>button]:text-muted-foreground [&>button]:hover:text-neon"
          >
            {/* visually hidden title for screen readers */}
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <SidebarContent email={email} />
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
