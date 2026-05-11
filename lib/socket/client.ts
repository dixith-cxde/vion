"use client";

import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export async function connectSocket(token: string) {
  if (socket?.connected) return socket;
  socket = io({ auth: { token }, withCredentials: true });

  return socket;
}

export function getSocket() {
  if (!socket) throw new Error("Socket connection not initialized");

  return socket;
}

export function disconnectSocket() {
  if (!socket) {
    return;
  }

  socket.disconnect();

  socket = null;
}
