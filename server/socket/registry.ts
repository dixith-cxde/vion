import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";
import { registerChatHandler } from "./handler/chat.handler";
import { registerNotificationHandler } from "./handler/notification.handler";
import { AuthenticatedSocket } from "./middleware/auth.middleware";

type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedSocketServer, socket: AuthenticatedSocket) {
  registerChatHandler(io, socket);
  registerNotificationHandler(io, socket);
}
