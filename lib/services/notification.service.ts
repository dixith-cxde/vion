import { prisma } from "@/lib/prisma";
import { emitNotification } from "@/server/socket/events/notification.events";

type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "INVITE_RECEIVED"
  | "MENTIONED"
  | "DOCUMENT_LINKED";

type CreateNotificationInput = {
  userId: string;
  senderId?: string;
  workspaceId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
};

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      senderId: input.senderId ?? null,
      workspaceId: input.workspaceId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });

  console.log("NOTIFICATION CREATED:", notification.id);

  const recipient = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { clerkId: true },
  });

  if (recipient?.clerkId) emitNotification({ userId: recipient.clerkId, notification });

  return notification;
}
