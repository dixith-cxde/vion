import { getIO } from "../io";
import { getUserRoom } from "../room";
import { NotificationWithSender } from "@/types/notification.type";

type EmitNotificationParams = {
  userId: string;
  notification: NotificationWithSender;
};

type EmitNotificationRemovalParams = {
  userId: string;
  notificationId: string;
};

export function emitNotification({ userId, notification }: EmitNotificationParams) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getUserRoom(userId)).emit("notification:new", notification);
}

export function emitNotificationRemoval({ userId, notificationId }: EmitNotificationRemovalParams) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getUserRoom(userId)).emit("notification:remove", {
    id: notificationId,
  });
}
