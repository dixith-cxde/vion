"use client";

import type { SaveState } from "@/types";

export const SAVE_STATE_TEXT: Record<SaveState, string> = {
  idle: "text-muted-foreground/30",
  saving: "text-amber-500 animate-pulse",
  saved: "text-emerald-500",
  error: "text-rose-500",
};

export const SAVE_STATE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving",
  saved: "Saved",
  error: "Error",
};

export const DOC_STATUS_CLASS: Record<string, string> = {
  PUBLISHED: "bg-blue-50 text-blue-600 border-blue-100",
  DRAFT: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

export type WorkspaceMember = {
  user: { id: string; name: string | null; email: string | null };
};

export type DocumentMetaState = {
  title: string;
  summary: string;
  status: "DRAFT" | "PUBLISHED";
  version: number;
  authorId: string;
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function isDocStatus(value: string): value is "DRAFT" | "PUBLISHED" {
  return value === "DRAFT" || value === "PUBLISHED";
}

export function formatMemberLabel(m: { name: string | null; email: string | null }) {
  return m.name ?? m.email ?? "Unknown";
}
