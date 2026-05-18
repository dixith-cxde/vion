"use client";

import { Card, CardContent } from "@/components/ui/card";

interface TaskProgressProps {
  tasks: number;
  doneCount: number;
  inProgressCount: number;
  blockedCount?: number;
  completionRate: number;
}

const SEGMENT_META = {
  done: { label: "Done", color: "#3B6D11" },
  inProgress: { label: "In progress", color: "#854F0B" },
  blocked: { label: "Blocked", color: "#A32D2D" },
  todo: { label: "Todo", color: "#B4B2A9" },
} as const;

export function TaskProgress({
  tasks,
  doneCount,
  inProgressCount,
  blockedCount = 0,
  completionRate,
}: TaskProgressProps) {
  if (tasks === 0) return null;

  const todoCount = Math.max(0, tasks - doneCount - inProgressCount - blockedCount);

  const pct = (n: number) => Math.round((n / tasks) * 100);

  const segments = [
    { ...SEGMENT_META.done, count: doneCount, pct: pct(doneCount) },
    { ...SEGMENT_META.inProgress, count: inProgressCount, pct: pct(inProgressCount) },
    { ...SEGMENT_META.blocked, count: blockedCount, pct: pct(blockedCount) },
    {
      ...SEGMENT_META.todo,
      count: todoCount,
      pct: 100 - pct(doneCount) - pct(inProgressCount) - pct(blockedCount),
    },
  ].filter((s) => s.count > 0);

  return (
    <Card className="rounded-xl border shadow-none">
      <CardContent className="px-5 py-4">
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">Workspace progress</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{doneCount}</span>
            {" / "}
            {tasks} completed
            {completionRate > 0 && (
              <span className="ml-2 text-muted-foreground">· {completionRate}%</span>
            )}
          </p>
        </div>

        {/* Segmented bar */}
        <div
          className="flex h-1.5 w-full overflow-hidden rounded-full"
          style={{ gap: "2px" }}
          role="img"
          aria-label={`Task progress bar: ${segments.map((s) => `${s.count} ${s.label}`).join(", ")}`}
        >
          {segments.map((seg, i) => {
            const only = segments.length === 1;
            const first = i === 0;
            const last = i === segments.length - 1;
            return (
              <div
                key={seg.label}
                style={{
                  width: `${seg.pct}%`,
                  backgroundColor: seg.color,
                  flexShrink: 0,
                  borderRadius: only
                    ? "99px"
                    : first
                      ? "99px 0 0 99px"
                      : last
                        ? "0 99px 99px 0"
                        : "0",
                  transition: "width 0.4s ease",
                }}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {segments.map((seg) => (
            <span key={seg.label} className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: seg.color }} />
              <span className="text-xs text-muted-foreground">
                <span className="font-medium" style={{ color: seg.color }}>
                  {seg.count}
                </span>{" "}
                {seg.label}
              </span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
