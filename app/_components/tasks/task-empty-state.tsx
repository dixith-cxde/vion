"use client";

import { FolderKanban, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-border/60 bg-background/50 px-6 py-14 text-center backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.015] to-transparent" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl border bg-white/[0.03]">
          <FolderKanban className="size-5 text-muted-foreground" />
        </div>

        <p className="text-sm font-semibold text-foreground">{title}</p>

        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>

        {actionLabel && onAction && (
          <Button onClick={onAction} size="sm" className="mt-5 rounded-xl">
            <Plus className="size-4" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
