import { TaskStatus, TaskLifecycle } from "@/lib/generated/prisma/client";

export function isKanbanStatus(status: TaskStatus) {
  return ["TODO", "IN_PROGRESS", "DONE"].includes(status);
}

export function canMoveTask(task: {
  status: TaskStatus;
  lifecycle: TaskLifecycle;
}) {
  return task.lifecycle === "ACTIVE";
}

export function getNextStatus(status: TaskStatus): TaskStatus {
  if (status === "TODO") return "IN_PROGRESS";
  if (status === "IN_PROGRESS") return "DONE";
  return "TODO";
}
