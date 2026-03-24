"use client";

import { Link as LinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Extracts a group ID from either a full URL (e.g. https://…/groups/clxyz123)
 * or a bare group ID string.
 */
function extractGroupId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try to parse as URL containing /groups/<id>
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/groups\/([^/]+)/);
    if (match?.[1]) return match[1];
  } catch {
    // Not a URL — continue
  }

  // Try plain path like /groups/<id>
  const pathMatch = trimmed.match(/\/groups\/([^/]+)/);
  if (pathMatch?.[1]) return pathMatch[1];

  // Assume it's a bare group ID (cuid-like)
  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;

  return null;
}

export function JoinGroupForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const groupId = extractGroupId(value);
    if (!groupId) {
      setError("Paste a group link or ID");
      return;
    }
    setError("");
    router.push(`/groups/${groupId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          placeholder="Paste group link or ID"
          className="pl-9"
          autoCapitalize="none"
          autoCorrect="off"
        />
      </div>
      <Button type="submit" disabled={!value.trim()}>
        Go
      </Button>
    </form>
  );
}
