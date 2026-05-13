import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";

declare global {

  var __vion_io__: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | undefined;
}

export function initializeSocket(server: HTTPServer) {
  if (global.__vion_io__) {
    return global.__vion_io__;
  }

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
      origin: "*",
      credentials: true,
    },
  });

  global.__vion_io__ = io;

  return io;
}

export function getIO() {
  return global.__vion_io__ ?? null;
}
