"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TaskLifecycle, TaskStatus } from "@/lib/generated/prisma/client";

import {
  LIFECYCLE_CLASS,
  LIFECYCLE_LABEL,
  PRIORITY_CLASS,
  PRIORITY_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  TASK_LIFECYCLE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  type MemberOption,
  type TaskMetaState,
  type TaskPriority,
} from "./task-constants";
import { AssignedToPicker } from "./task-assignee-picker";

type TaskPropertiesProps = {
  meta: TaskMetaState;
  updateMeta: (patch: Partial<TaskMetaState>) => void;
  members: MemberOption[];
  selectedAssignee: MemberOption | null;
  editable: boolean;
};

export function TaskProperties({
  meta,
  updateMeta,
  members,
  selectedAssignee,
  editable,
}: TaskPropertiesProps) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border/50 bg-muted/20 p-4 sm:grid-cols-3">
      <PropCell label="Status">
        <PillSelect
          value={meta.status}
          onValueChange={(v) => updateMeta({ status: v as TaskStatus })}
          className={STATUS_CLASS[meta.status]}
          disabled={!editable}
        >
          {TASK_STATUS_OPTIONS.map((v) => (
            <SelectItem key={v} value={v}>
              {STATUS_LABEL[v]}
            </SelectItem>
          ))}
        </PillSelect>
      </PropCell>

      <PropCell label="Priority">
        <PillSelect
          value={meta.priority}
          onValueChange={(v) => updateMeta({ priority: v as TaskPriority })}
          className={PRIORITY_CLASS[meta.priority]}
          disabled={!editable}
        >
          {TASK_PRIORITY_OPTIONS.map((v) => (
            <SelectItem key={v} value={v}>
              {PRIORITY_LABEL[v]}
            </SelectItem>
          ))}
        </PillSelect>
      </PropCell>

      <PropCell label="Lifecycle">
        <PillSelect
          value={meta.lifecycle}
          onValueChange={(v) => updateMeta({ lifecycle: v as TaskLifecycle })}
          className={LIFECYCLE_CLASS[meta.lifecycle]}
          disabled={!editable}
        >
          {TASK_LIFECYCLE_OPTIONS.map((v) => (
            <SelectItem key={v} value={v}>
              {LIFECYCLE_LABEL[v]}
            </SelectItem>
          ))}
        </PillSelect>
      </PropCell>

      <PropCell label="Assigned to">
        <AssignedToPicker
          members={members}
          value={meta.assignedToId}
          onChange={(v) => updateMeta({ assignedToId: v })}
          selectedMember={selectedAssignee}
          disabled={!editable}
        />
      </PropCell>

      <PropCell label="Due date">
        <div className="flex h-8 w-full items-center rounded-lg border border-fuchsia-100 bg-fuchsia-50 px-3">
          <Input
            type="date"
            value={meta.dueDate}
            onChange={(e) => updateMeta({ dueDate: e.target.value })}
            readOnly={!editable}
            className="h-auto flex-1 border-0 bg-transparent p-0 text-[11px] font-medium text-fuchsia-600 shadow-none focus-visible:ring-0"
          />
        </div>
      </PropCell>

      <PropCell label="Estimate">
        <div className="flex h-8 w-full items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-3">
          <Input
            type="number"
            min="0"
            placeholder="0"
            value={meta.estimatedAt}
            onChange={(e) => updateMeta({ estimatedAt: e.target.value })}
            readOnly={!editable}
            className="h-auto flex-1 border-0 bg-transparent p-0 text-[11px] font-semibold text-indigo-600 shadow-none focus-visible:ring-0"
          />
          <span className="text-[10px] text-indigo-400">hrs</span>
        </div>
      </PropCell>
    </div>
  );
}

function PropCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
        {label}
      </span>
      {children}
    </div>
  );
}

function PillSelect({
  value,
  onValueChange,
  className,
  children,
  disabled = false,
}: {
  value: string;
  onValueChange: (v: string) => void;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "h-8 w-full rounded-lg border px-3 text-[11px] font-medium shadow-none focus-visible:ring-0",
          className
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}
