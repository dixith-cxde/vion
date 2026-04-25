import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification.service";

export async function resolveWorkspaceAssignee(
  workspaceId: string,
  assignedToId: string | null | undefined,
) {
  if (assignedToId === undefined) {
    return {
      assigneeId: undefined,
    };
  }

  if (assignedToId === null) {
    return {
      assigneeId: null,
    };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: assignedToId,
      },
    },
    select: {
      userId: true,
    },
  });

  if (!membership) {
    throw new Error("INVALID_ASSIGNEE");
  }

  return {
    assigneeId: membership.userId,
  };
}

export async function notifyTaskAssignment(params: {
  assignedToId: string | null | undefined;
  previousAssignedToId?: string | null;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  actorLabel: string;
}) {
  const {
    assignedToId,
    previousAssignedToId,
    taskId,
    taskTitle,
    workspaceId,
    actorLabel,
  } = params;

  if (!assignedToId || assignedToId === previousAssignedToId) {
    return;
  }

  await createNotification({
    userId: assignedToId,
    workspaceId,
    type: "TASK_ASSIGNED",
    title: "Task assigned",
    message: `${actorLabel} assigned you to "${taskTitle}".`,
    entityType: "TASK",
    entityId: taskId,
  });
}
