import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification.service";

export async function resolveWorkspaceAssignee(
  workspaceId: string,
  assigneeId: string | null | undefined,
) {
  if (assigneeId === undefined) {
    return {
      assigneeId: undefined,
    };
  }

  if (assigneeId === null) {
    return {
      assigneeId: null,
    };
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: assigneeId,
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
  assigneeId: string | null | undefined;
  previousAssigneeId?: string | null;
  taskId: string;
  taskTitle: string;
  workspaceId: string;
  actorLabel: string;
}) {
  const {
    assigneeId,
    previousAssigneeId,
    taskId,
    taskTitle,
    workspaceId,
    actorLabel,
  } = params;

  if (!assigneeId || assigneeId === previousAssigneeId) {
    return;
  }

  await createNotification({
    userId: assigneeId,
    workspaceId,
    type: "TASK_ASSIGNED",
    title: "Task assigned",
    message: `${actorLabel} assigned you to "${taskTitle}".`,
    entityType: "TASK",
    entityId: taskId,
  });
}
