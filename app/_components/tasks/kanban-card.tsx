"use client";

import { useDraggable } from "@dnd-kit/core";
import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  GripVertical,
  Layers3,
} from "lucide-react";

import { Task } from "@/lib/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { canMoveTask } from "@/lib/tasks/task-rules";
import { formatStatus } from "./kanban-column";

export function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const isDraggable = canMoveTask(task);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !isDraggable,
    data: {
      type: "task",
      status: task.status,
    },
  });

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    if (pointerStartRef.current) {
      const deltaX = event.clientX - pointerStartRef.current.x;
      const deltaY = event.clientY - pointerStartRef.current.y;
      const moved = Math.hypot(deltaX, deltaY);

      if (moved > 6) {
        pointerStartRef.current = null;
        return;
      }
    }

    pointerStartRef.current = null;
    router.push(`/workspaces/${task.workspaceId}/tasks/${task.id}`);
  }

  return (
    <div
      ref={setNodeRef}
      onClick={handleCardClick}
      onPointerDown={handlePointerDown}
      style={{
        transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
      }}
      className={`cursor-pointer rounded-2xl border border-border/70 bg-background p-3 text-sm transition-[transform,border-color,background-color] hover:border-foreground/20 hover:bg-muted/20 ${
        isDragging ? "z-20 ring-1 ring-border/70" : ""
      } ${isDraggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="line-clamp-2 font-medium text-foreground">{task.title}</div>
          <div className="line-clamp-2 text-xs leading-5 text-muted-foreground">
            {getTaskPreview(task)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-border/70 bg-muted/40 text-[10px] font-medium"
          >
            {formatPriority(task.priority)}
          </Badge>
          {isDraggable ? (
            <button
              type="button"
              aria-label={`Drag ${task.title}`}
              className="rounded-full bg-muted p-1 text-muted-foreground"
              onClick={(event) => event.stopPropagation()}
              {...listeners}
              {...attributes}
            >
              <GripVertical className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="border-border/70 bg-muted/30 text-[10px]">
          {formatLifecycle(task.lifecycle)}
        </Badge>
        {task.dueDate ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Due {formatDate(task.dueDate)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5" />
          Updated {formatDate(task.updatedAt)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Layers3 className="size-3.5" />
          {formatStatus(task.status)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          Open
          <ArrowUpRight className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

function formatPriority(priority: string) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

function formatLifecycle(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function getTaskPreview(task: Task) {
  const preview = extractDescriptionPreview(task.description);

  if (preview) {
    return preview;
  }

  return `Priority ${formatPriority(task.priority)}${task.dueDate ? `, due ${formatDate(task.dueDate)}` : ""}.`;
}

function extractDescriptionPreview(value: string | null) {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const fromBlocks = extractText(parsed).trim();
    return fromBlocks || null;
  } catch {
    return trimmed;
  }
}

function extractText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(extractText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.values(value).map(extractText).join(" ");
  }

  return "";
}
