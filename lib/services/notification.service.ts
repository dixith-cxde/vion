import { NotificationType } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { emitNotification } from "@/server/socket/events/notification.events";
import { NotificationWithSender } from "@/types/notification.type";

export const notificationWithSenderSelect = {
  id: true,
  userId: true,
  type: true,
  title: true,
  message: true,
  isRead: true,
  entityType: true,
  entityId: true,
  workspaceId: true,
  senderId: true,
  relationshipId: true,
  createdAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      imageUrl: true,
    },
  },
} as const;

type CreateNotificationInput = {
  userId: string;
  senderId?: string;
  workspaceId?: string | null;
  type: (typeof NotificationType)[keyof typeof NotificationType];
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  relationshipId?: string | null;
};

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationWithSender> {
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
      relationshipId: input.relationshipId ?? null,
    },
    select: notificationWithSenderSelect,
  });

  emitNotification({ userId: notification.userId, notification });

  return notification;
}
