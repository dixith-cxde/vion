import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";
import { registerChatHandler } from "./handler/chat.handler";
import { AuthenticatedSocket } from "./middleware/auth.middleware";

type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedSocketServer, socket: AuthenticatedSocket) {
  registerChatHandler(io, socket);

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
}
