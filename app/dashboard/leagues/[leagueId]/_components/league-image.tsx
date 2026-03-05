"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { updateLeagueImageAction } from "../actions";

interface LeagueImageProps {
  leagueId: string;
  name: string;
  imageUrl: string | null;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function LeagueImage({ leagueId, name, imageUrl }: LeagueImageProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const uploading = progress || isPending;
  const src = preview ?? imageUrl;

  function handleClick() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setError(null);
    setProgress(true);

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await updateLeagueImageAction(leagueId, formData);
      setProgress(false);
      if (result.error) {
        setError(result.error);
        setPreview(null);
      } else {
        // Replace object URL with the persisted CDN URL so it stays after unmount
        setPreview(result.url ?? null);
      }
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
    });

    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl ring-2 ring-border transition-shadow focus-visible:outline-none focus-visible:ring-neon disabled:cursor-wait"
        aria-label="Change league image"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-xl font-bold text-muted-foreground">
            {getInitials(name)}
          </div>
        )}

        {/* Camera overlay on hover / while uploading */}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {uploading ? (
            <svg
              className="h-5 w-5 animate-spin text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          ) : (
            <Camera size={20} className="text-white" />
          )}
        </div>
      </button>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
