import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function initializeSocket(server: HTTPServer) {
  if (io) {
    return io;
  }

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(server);

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }

  return io;
}
