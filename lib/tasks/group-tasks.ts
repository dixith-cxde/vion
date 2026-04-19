import { Task, TaskStatus } from "@/lib/generated/prisma/client";

export function groupTasks(tasks: Task[]) {
  return {
    TODO: tasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS"),
    DONE: tasks.filter((t) => t.status === "DONE"),
  } as Record<TaskStatus, Task[]>;
}
