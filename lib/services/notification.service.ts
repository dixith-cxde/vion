import { prisma } from "@/lib/prisma";

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

  const user = await prisma.user.findUnique({
    where: { id: notification.userId },
    select: { clerkId: true },
  });

  if (user?.clerkId) {
    console.log("EMITTING TO SOCKET:", user.clerkId);
    await emitNotification(user.clerkId, notification);
  }

  return notification;
}

async function emitNotification(userId: string, data: unknown) {
  try {
    await fetch("http://localhost:4000/emit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        event: "notification:new",
        data,
      }),
    });
  } catch (err) {
    console.error("Socket emit failed:", err);
  }
}
