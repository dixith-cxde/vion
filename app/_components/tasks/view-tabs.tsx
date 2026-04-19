"use client";

import { TaskLifecycle } from "@/lib/generated/prisma/client";
import { cn } from "@/lib/utils";

type Props = {
  view: TaskLifecycle;
  setView: (view: TaskLifecycle) => void;
  counts: Record<TaskLifecycle, number>;
};

const VIEWS: TaskLifecycle[] = [
  "ACTIVE",
  "PLANNED",
  "UPCOMING",
  "DRAFT",
  "ARCHIVED",
];

export function ViewTabs({ view, setView, counts }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
            view === v
              ? "border-transparent bg-foreground text-background"
              : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {formatLabel(v)}
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px]",
              view === v
                ? "bg-background/15 text-background"
                : "bg-muted text-foreground",
            )}
          >
            {counts[v]}
          </span>
        </button>
      ))}
    </div>
  );
}

function formatLabel(value: TaskLifecycle) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}
