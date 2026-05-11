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
  console.log("IO EXISTS:", !!io);

  if (!io) {
    console.warn("Socket.io unavailable during notification emit");

    return;
  }

  console.log("EMITTING TO ROOM:", getUserRoom(userId));

  io.to(getUserRoom(userId)).emit("notification:new", notification);
}

export function emitNotificationRemoval({ userId, notificationId }: EmitNotificationRemovalParams) {
  const io = getIO();

  if (!io) {
    console.warn("Socket.io unavailable during notification removal emit");

    return;
  }

  console.log("EMITTING REMOVE TO ROOM:", getUserRoom(userId));

  io.to(getUserRoom(userId)).emit("notification:remove", {
    id: notificationId,
  });
}
