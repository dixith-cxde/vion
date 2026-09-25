import { Server as HTTPServer } from "http";
import { initializeSocket } from "./io";
import { socketAuthMiddleware } from "./middleware/auth.middleware";
import { registerSocketHandlers } from "./registry";
import { getUserRoom } from "./room";

export function registerSocketServer(httpServer: HTTPServer) {
  const io = initializeSocket(httpServer);
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    if (userId) {
      socket.join(getUserRoom(userId));
    }

    registerSocketHandlers(io, socket);
  });

  return io;
}
