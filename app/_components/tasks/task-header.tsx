"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TasksHeaderProps {
  tasks: number;
  doneCount: number;
  inProgressCount: number;
  onCreateTask: () => void;
}

export function TasksHeader({ tasks, doneCount, inProgressCount, onCreateTask }: TasksHeaderProps) {
  return (
    <div className="relative mb-10 overflow-hidden w-full">
      <div className="relative z-10 flex items-start justify-between gap-6">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">
              Workspace Tasks
            </span>
          </div>

          <h1 className="text-5xl font-black tracking-[-0.06em] text-foreground uppercase">
            Tasks
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            Operational task management and workflow tracking across the workspace.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 *:px-5  *:py-3.5">
            <Badge variant={"secondary"}>{tasks} total tasks</Badge>

            <Badge variant={"secondary"} className="bg-green-300/50">
              {doneCount} completed
            </Badge>
            <Badge variant={"outline"}>{inProgressCount} in progress</Badge>
          </div>
        </div>

        <Button
          size="sm"
          onClick={onCreateTask}
          className={cn("h-11 rounded-xl px-5", "transition-all duration-300")}
        >
          <Plus className="size-4" />
          New task
        </Button>
      </div>
    </div>
  );
}
