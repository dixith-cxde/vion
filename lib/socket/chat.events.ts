import { getIO } from "@/server/socket/io";
import { MessageWithRelations } from "@/types/message.type";

type EmitChannelMessageInput = {
  channelId: string;

  message: MessageWithRelations;
};

export function emitChannelMessage({ channelId, message }: EmitChannelMessageInput) {
  const io = getIO();

  if (!io) {
    console.warn("Socket.io server not initialized");

    return;
  }

  io.to(`channel:${channelId}`).emit("message:new", message);
}
