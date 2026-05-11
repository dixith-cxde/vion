import { Server as HTTPServer } from "http";
import { initializeSocket } from "./io";
import { socketAuthMiddleware } from "./middleware/auth.middleware";
import { registerSocketHandlers } from "./registry";
import { getUserRoom } from "./room";

export function registerSocketServer(httpServer: HTTPServer) {
  const io = initializeSocket(httpServer);
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    const userId = socket.data.userId;
    if (userId) {
      const room = getUserRoom(userId);
      socket.join(room);
      console.log("JOINING ROOM:", room);
    }

    registerSocketHandlers(io, socket);
  });

  return io;
}
