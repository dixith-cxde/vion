import { Server } from "socket.io";

import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";

import { AuthenticatedSocket } from "../middleware/auth.middleware";
import { getChannelRoom, getWorkspaceRoom } from "../room";
import { prisma } from "@/lib/prisma";

type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

const workspacePresence = new Map<string, Map<string, number>>();
const channelPresence = new Map<string, Map<string, number>>();
const channelTyping = new Map<string, Map<string, number>>();

type SocketState = {
  workspaces: Set<string>;
  channels: Set<string>;
  typingChannels: Set<string>;
};

const socketState = new Map<string, SocketState>();

function getSocketState(socketId: string): SocketState {
  const existing = socketState.get(socketId);

  if (existing) {
    return existing;
  }

  const created = {
    workspaces: new Set<string>(),
    channels: new Set<string>(),
    typingChannels: new Set<string>(),
  };

  socketState.set(socketId, created);

  return created;
}

function incrementPresenceCounter(
  store: Map<string, Map<string, number>>,
  roomId: string,
  userId: string,
) {
  const users = store.get(roomId) ?? new Map<string, number>();
  users.set(userId, (users.get(userId) ?? 0) + 1);
  store.set(roomId, users);
}

function decrementPresenceCounter(
  store: Map<string, Map<string, number>>,
  roomId: string,
  userId: string,
) {
  const users = store.get(roomId);

  if (!users) {
    return;
  }

  const nextCount = (users.get(userId) ?? 0) - 1;

  if (nextCount > 0) {
    users.set(userId, nextCount);
  } else {
    users.delete(userId);
  }

  if (users.size === 0) {
    store.delete(roomId);
  }
}

function getPresentUserIds(store: Map<string, Map<string, number>>, roomId: string) {
  return Array.from(store.get(roomId)?.keys() ?? []);
}

function emitWorkspacePresence(io: TypedSocketServer, workspaceId: string) {
  io.to(getWorkspaceRoom(workspaceId)).emit("workspace:presence", {
    workspaceId,
    userIds: getPresentUserIds(workspacePresence, workspaceId),
  });
}

function emitPresence(io: TypedSocketServer, channelId: string) {
  io.to(getChannelRoom(channelId)).emit("channel:presence", {
    channelId,
    userIds: getPresentUserIds(channelPresence, channelId),
  });
}

function emitTyping(
  io: TypedSocketServer,
  channelId: string,
  userId: string,
  userName: string,
  typing: boolean,
) {
  io.to(getChannelRoom(channelId)).emit("typing:update", {
    channelId,
    userId,
    userName,
    typing,
  });
}

function removeUserFromChannelState(io: TypedSocketServer, channelId: string, userId: string) {
  decrementPresenceCounter(channelPresence, channelId, userId);
  decrementPresenceCounter(channelTyping, channelId, userId);

  emitPresence(io, channelId);
}

export function registerChatHandler(io: TypedSocketServer, socket: AuthenticatedSocket) {
  const state = getSocketState(socket.id);

  socket.on("workspace:join", async ({ workspaceId }) => {
    if (state.workspaces.has(workspaceId)) {
      return;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: socket.data.userId } },
      select: { id: true },
    });

    if (!member) {
      return;
    }

    socket.join(getWorkspaceRoom(workspaceId));
    state.workspaces.add(workspaceId);
    incrementPresenceCounter(workspacePresence, workspaceId, socket.data.userId);
    emitWorkspacePresence(io, workspaceId);
  });

  socket.on("workspace:leave", ({ workspaceId }) => {
    if (!state.workspaces.has(workspaceId)) {
      return;
    }

    socket.leave(getWorkspaceRoom(workspaceId));
    state.workspaces.delete(workspaceId);
    decrementPresenceCounter(workspacePresence, workspaceId, socket.data.userId);
    emitWorkspacePresence(io, workspaceId);
  });

  socket.on("channel:join", async ({ channelId }) => {
    if (state.channels.has(channelId)) {
      emitPresence(io, channelId);
      return;
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { id: true, workspaceId: true },
    });

    if (!channel) {
      return;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: channel.workspaceId, userId: socket.data.userId },
      },
      select: { id: true },
    });

    if (!member) {
      return;
    }

    socket.join(getChannelRoom(channelId));
    state.channels.add(channelId);
    incrementPresenceCounter(channelPresence, channelId, socket.data.userId);

    emitPresence(io, channelId);
  });

  socket.on("channel:leave", ({ channelId }) => {
    if (!state.channels.has(channelId)) {
      return;
    }

    socket.leave(getChannelRoom(channelId));
    state.channels.delete(channelId);
    state.typingChannels.delete(channelId);
    removeUserFromChannelState(io, channelId, socket.data.userId);
  });

  socket.on("typing:start", async ({ channelId }) => {
    if (!state.channels.has(channelId)) {
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: socket.data.userId,
      },
      select: {
        name: true,
        username: true,
      },
    });

    if (!state.typingChannels.has(channelId)) {
      state.typingChannels.add(channelId);
      incrementPresenceCounter(channelTyping, channelId, socket.data.userId);
    }

    emitTyping(
      io,
      channelId,
      socket.data.userId,
      user?.name || user?.username || "Unknown user",
      true,
    );
  });

  socket.on("typing:stop", async ({ channelId }) => {
    if (!state.channels.has(channelId)) {
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: socket.data.userId,
      },
      select: {
        name: true,
        username: true,
      },
    });

    if (state.typingChannels.has(channelId)) {
      state.typingChannels.delete(channelId);
      decrementPresenceCounter(channelTyping, channelId, socket.data.userId);
    }

    emitTyping(
      io,
      channelId,
      socket.data.userId,
      user?.name || user?.username || "Unknown user",
      false,
    );
  });

  socket.on("disconnect", () => {
    for (const workspaceId of state.workspaces) {
      decrementPresenceCounter(workspacePresence, workspaceId, socket.data.userId);
      emitWorkspacePresence(io, workspaceId);
    }

    for (const channelId of state.channels) {
      removeUserFromChannelState(io, channelId, socket.data.userId);
    }

    socketState.delete(socket.id);
  });
}
