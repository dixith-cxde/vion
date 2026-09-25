import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";
import { AuthenticatedSocket } from "../middleware/auth.middleware";
import { getUserRoom } from "../room";

type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerNotificationHandler(_io: TypedSocketServer, socket: AuthenticatedSocket) {
  socket.join(getUserRoom(socket.data.userId));
}
