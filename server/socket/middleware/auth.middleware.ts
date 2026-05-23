import { verifyToken } from "@clerk/backend";
import { Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";
import { prisma } from "@/lib/prisma";

export type AuthenticatedSocket = Socket<ClientToServerEvents, ServerToClientEvents> & {
  data: {
    userId: string;
    clerkId: string;
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

    const user = await prisma.user.findUnique({
      where: {
        clerkId: payload.sub,
      },
      select: {
        id: true,
        clerkId: true,
      },
    });

    if (!user) {
      return next(new Error("Database user not found"));
    }

    socket.data.userId = user.id;
    socket.data.clerkId = user.clerkId;

    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error("Socket authentication failed"));
  }
}
