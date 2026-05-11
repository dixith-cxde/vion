import { Server } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";
import { AuthenticatedSocket } from "../middleware/auth.middleware";
import { getChannelRoom } from "../room";

type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerChatHandler(_io: TypedSocketServer, socket: AuthenticatedSocket) {
  socket.on("channel:join", ({ channelId }) => {
    const room = getChannelRoom(channelId);

    socket.join(room);

    console.log(`Socket ${socket.id} joined ${room}`);
  });

  socket.on("channel:leave", ({ channelId }) => {
    const room = getChannelRoom(channelId);

    socket.leave(room);

    console.log(`Socket ${socket.id} left ${room}`);
  });
}
