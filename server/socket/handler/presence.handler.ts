import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";
import { AuthenticatedSocket } from "../middleware/auth.middleware";

type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerPresenceHandler(_io: TypedSocketServer, socket: AuthenticatedSocket) {
  console.log(`Presence initialized for ${socket.data.userId}`);
}
