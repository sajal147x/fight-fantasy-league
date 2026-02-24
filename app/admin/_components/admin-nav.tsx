"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/fighters", label: "Fighters", icon: Users, exact: false },
  { href: "/admin/events", label: "Events", icon: Calendar, exact: false },
  { href: "/admin/fights", label: "Fights", icon: Swords, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV_LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
              "border-l-2 transition-all duration-150",
              active
                ? "border-neon bg-neon/10 text-neon drop-shadow-neon-sm"
                : "border-transparent text-muted-foreground hover:border-neon/40 hover:bg-neon/5 hover:text-foreground"
            )}
          >
            <Icon
              size={16}
              className={cn(
                "shrink-0 transition-colors duration-150",
                active ? "text-neon" : "group-hover:text-neon/70"
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
