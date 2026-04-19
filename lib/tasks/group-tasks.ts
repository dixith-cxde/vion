import { Task } from "@/lib/generated/prisma/client";

export function groupTasks(tasks: Task[]) {
  const active = tasks.filter((t) => t.lifecycle === "ACTIVE");

  return {
    TODO: active.filter((t) => t.status === "TODO"),
    IN_PROGRESS: active.filter((t) => t.status === "IN_PROGRESS"),
    DONE: active.filter((t) => t.status === "DONE"),
  };
}
