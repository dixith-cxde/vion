import { Server as HTTPServer } from "http";
import { initializeSocket } from "./io";
import { socketAuthMiddleware } from "./middleware/auth.middleware";

export function registerSocketServer(httpServer: HTTPServer) {
  const io = initializeSocket(httpServer);
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
