import { Notification } from "@/lib/generated/prisma/client";
import { getIO } from "../io";
import { getUserRoom } from "../room";

type EmitNotificationParams = {
  userId: string;
  notification: Notification;
};

type EmitNotificationRemovalParams = {
  userId: string;
  notificationId: string;
};

export function emitNotification({ userId, notification }: EmitNotificationParams) {
  const io = getIO();
  console.log("EMITTING NOTIFICATION:", userId);

  io.to(getUserRoom(userId)).emit("notification:new", notification);
}

export function emitNotificationRemoval({ userId, notificationId }: EmitNotificationRemovalParams) {
  const io = getIO();

  io.to(getUserRoom(userId)).emit("notification:remove", {
    id: notificationId,
  });
}
