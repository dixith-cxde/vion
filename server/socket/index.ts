import { Server as HTTPServer } from "http";
import { initializeSocket } from "./io";
import { socketAuthMiddleware } from "./middleware/auth.middleware";
import { registerSocketHandlers } from "./registry";

export function registerSocketServer(httpServer: HTTPServer) {
  const io = initializeSocket(httpServer);

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    registerSocketHandlers(io, socket);
  });

  return io;
}
