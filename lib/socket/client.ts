import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export async function connectSocket(token: string) {
  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io({
    auth: {
      token,
    },

    withCredentials: true,
  });

  return socket;
}

export function reauthSocket(token: string) {
  if (!socket) {
    return;
  }

  socket.auth = { token };
  socket.disconnect();
  socket.connect();
}

export function getSocket() {
  return socket;
}

export function hasSocket() {
  return !!socket;
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.disconnect();

  socket = null;
}
