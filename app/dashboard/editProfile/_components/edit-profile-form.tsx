"use client";

import { useRef, useState } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile } from "../actions";

interface EditProfileFormProps {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export function EditProfileForm({ name, email, avatarUrl }: EditProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [pending, setPending] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    await saveProfile(formData);
    // redirect happens server-side; reset pending if somehow still mounted
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Profile picture"
              className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted ring-2 ring-border">
              <User size={36} className="text-muted-foreground" />
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
          >
            Edit
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          name="avatar"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <p className="text-xs text-muted-foreground sm:pt-1">
          JPG, PNG or GIF · Max 5 MB
        </p>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={name ?? ""}
          placeholder="Your display name"
          maxLength={80}
        />
      </div>

      {/* Email (read-only) */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          value={email}
          readOnly
          disabled
          className="cursor-not-allowed opacity-60"
        />
        <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
