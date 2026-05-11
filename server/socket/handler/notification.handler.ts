import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";
import { AuthenticatedSocket } from "../middleware/auth.middleware";
import { getUserRoom } from "../room";

type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerNotificationHandler(_io: TypedSocketServer, socket: AuthenticatedSocket) {
  const userRoom = getUserRoom(socket.data.userId);

  socket.join(userRoom);

  console.log(`Authenticated user joined ${userRoom}`);
}
