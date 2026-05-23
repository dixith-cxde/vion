import { ChannelWithRelations } from "@/types/channel.type";
import { MessageWithRelations } from "@/types/message.type";
import { getIO } from "@/server/socket/io";
import { getChannelRoom, getWorkspaceRoom } from "@/server/socket/room";

export function emitChannelMessage({
  workspaceId,
  channelId,
  message,
}: {
  workspaceId: string;
  channelId: string;
  message: MessageWithRelations;
}) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getChannelRoom(channelId)).emit("message:new", {
    workspaceId,
    channelId,
    message,
  });
}

export function emitChannelUpdated({
  workspaceId,
  channel,
}: {
  workspaceId: string;
  channel: ChannelWithRelations;
}) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getWorkspaceRoom(workspaceId)).emit("channel:updated", {
    workspaceId,
    channel,
  });
}

export function emitChannelActivity({
  workspaceId,
  channelId,
  message,
}: {
  workspaceId: string;
  channelId: string;
  message: MessageWithRelations;
}) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getWorkspaceRoom(workspaceId)).emit("channel:activity", {
    workspaceId,
    channelId,
    message,
  });
}

export function emitChannelCreated({
  workspaceId,
  channel,
}: {
  workspaceId: string;
  channel: ChannelWithRelations;
}) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getWorkspaceRoom(workspaceId)).emit("channel:created", {
    workspaceId,
    channel,
  });
}

export function emitMessageReaction({
  channelId,
  message,
}: {
  channelId: string;
  message: MessageWithRelations;
}) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getChannelRoom(channelId)).emit("message:reaction", {
    channelId,
    message,
  });
}

export function emitMessagePinned({
  channelId,
  message,
}: {
  channelId: string;
  message: MessageWithRelations;
}) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getChannelRoom(channelId)).emit("message:pinned", {
    channelId,
    message,
  });
}

export function emitChannelRead({
  channelId,
  userId,
  lastReadAt,
  lastReadMessageId,
}: {
  channelId: string;
  userId: string;
  lastReadAt: Date | string;
  lastReadMessageId: string | null;
}) {
  const io = getIO();

  if (!io) {
    return;
  }

  io.to(getChannelRoom(channelId)).emit("channel:read", {
    channelId,
    userId,
    lastReadAt: new Date(lastReadAt).toISOString(),
    lastReadMessageId,
  });
}
