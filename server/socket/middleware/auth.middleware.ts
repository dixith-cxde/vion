import { verifyToken } from "@clerk/nextjs/server";

import { Socket } from "socket.io";

import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";

export type AuthenticatedSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: {
    userId: string;
  };
};

type SocketMiddlewareNext = (error?: Error) => void;

export async function socketAuthMiddleware(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  next: SocketMiddlewareNext
) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Missing authentication token"));
    }

    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    if (!payload.sub) {
      return next(new Error("Invalid authentication token"));
    }

    socket.data.userId = payload.sub;

    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error("Socket authentication failed"));
  }
}
