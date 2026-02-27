"use client";

import Link from "next/link";
import { User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileButtonProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export function ProfileButton({ name, email, avatarUrl }: ProfileButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-neon/50">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name ?? email}
              className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted ring-1 ring-border">
              <User size={16} className="text-muted-foreground" />
            </div>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5">
          {name && (
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
          )}
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/editProfile">Edit Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <form action="/auth/signout" method="post" className="w-full">
            <button type="submit" className="w-full text-left text-destructive">
              Sign out
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
