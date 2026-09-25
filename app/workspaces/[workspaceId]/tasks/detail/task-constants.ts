import type { Block } from "@blocknote/core";
import type { Task, TaskLifecycle, TaskStatus } from "@/lib/generated/prisma/client";
import type { SaveState } from "@/types";

export const TASK_STATUS_OPTIONS: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_LIFECYCLE_OPTIONS: TaskLifecycle[] = [
  "ACTIVE",
  "PLANNED",
  "UPCOMING",
  "DRAFT",
  "ARCHIVED",
];
export const TASK_PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TaskPriority = (typeof TASK_PRIORITY_OPTIONS)[number];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
export const LIFECYCLE_LABEL: Record<TaskLifecycle, string> = {
  ACTIVE: "Active",
  PLANNED: "Planned",
  UPCOMING: "Upcoming",
  DRAFT: "Draft",
  ARCHIVED: "Archived",
};

export const STATUS_CLASS: Record<TaskStatus, string> = {
  TODO: "bg-slate-50 text-slate-600 border-slate-200",
  IN_PROGRESS: "bg-amber-50 text-amber-600 border-amber-100",
  DONE: "bg-emerald-50 text-emerald-600 border-emerald-100",
};
export const PRIORITY_CLASS: Record<TaskPriority, string> = {
  LOW: "bg-sky-50 text-sky-600 border-sky-100",
  MEDIUM: "bg-violet-50 text-violet-600 border-violet-100",
  HIGH: "bg-orange-50 text-orange-600 border-orange-100",
  CRITICAL: "bg-rose-50 text-rose-600 border-rose-100",
};
export const LIFECYCLE_CLASS: Record<TaskLifecycle, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-100",
  PLANNED: "bg-blue-50 text-blue-600 border-blue-100",
  UPCOMING: "bg-indigo-50 text-indigo-600 border-indigo-100",
  DRAFT: "bg-zinc-50 text-zinc-500 border-zinc-200",
  ARCHIVED: "bg-stone-50 text-stone-500 border-stone-200",
};
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

export type MemberOption = {
  user: { id: string; name: string | null; email: string | null };
};
export type TaskPerson = {
  id: string;
  name: string | null;
  email: string | null;
  imageUrl?: string | null;
};
export type TaskPermissions = {
  canEdit: boolean;
  canDelete: boolean;
  role: string;
};
export type TaskRecord = Task & {
  assignedToId?: string | null;
  assignedTo?: TaskPerson | null;
  createdBy?: TaskPerson | null;
};
export type TaskMetaState = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  lifecycle: TaskLifecycle;
  assignedToId: string | null;
  dueDate: string;
  estimatedAt: string;
};

export function normalizePriority(value: string): TaskPriority {
  return TASK_PRIORITY_OPTIONS.includes(value as TaskPriority) ? (value as TaskPriority) : "MEDIUM";
}
export function formatDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}
export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
export function safeParseDescription(value: unknown): Block[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value as Block[];
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Block[];
    } catch {
      return undefined;
    }
  }
  return undefined;
}
