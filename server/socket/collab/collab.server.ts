import { IncomingMessage } from "http";
import type { Server as HTTPServer } from "http";

import { createClerkClient, verifyToken } from "@clerk/backend";
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { WebSocketServer, type WebSocket } from "ws";

import { prisma } from "@/lib/prisma";

import { disposeCollabConnection, getCollabRoom } from "./collab.room";

import {
  awarenessProtocol,
  createAwarenessMessage,
  createSyncMessage,
  messageAwareness,
  messageQueryAwareness,
  messageSync,
  syncProtocol,
} from "./collab.utils";

let collabWss: WebSocketServer | null = null;

export function initializeCollabServer(server: HTTPServer) {
  if (collabWss) {
    return collabWss;
  }

  collabWss = new WebSocketServer({
    noServer: true,
  });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (!url.pathname.startsWith("/collab/")) {
      return;
    }

    collabWss?.handleUpgrade(request, socket, head, (ws) => {
      collabWss?.emit("connection", ws, request);
    });
  });

  collabWss.on("connection", (socket, request) => {
    void handleConnection(socket, request);
  });

  return collabWss;
}

async function resolveCollabClerkId(request: IncomingMessage, token: string | null) {
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (token) {
    const payload = await verifyToken(token, { secretKey });
    return payload.sub ?? null;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  const url = new URL(request.url ?? "/", "http://localhost");
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const state = await clerk.authenticateRequest(new Request(url, { headers }), {
    secretKey: process.env.CLERK_SECRET_KEY,
  });
  return state.toAuth()?.userId ?? null;
}

async function verifyCollabAccess(
  request: IncomingMessage,
  token: string | null,
  roomName: string,
) {
  try {
    const clerkId = await resolveCollabClerkId(request, token);

    if (!clerkId) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });

    if (!user) {
      return false;
    }

    const docMatch = /^doc-(.+)$/.exec(roomName);
    const taskMatch = /^task-(.+)$/.exec(roomName);
    const entityId = docMatch?.[1] ?? taskMatch?.[1];

    if (!entityId) {
      return false;
    }

    const entity = docMatch
      ? await prisma.document.findUnique({
          where: { id: entityId },
          select: { workspaceId: true },
        })
      : await prisma.task.findUnique({
          where: { id: entityId },
          select: { workspaceId: true },
        });

    if (!entity) {
      return false;
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: entity.workspaceId, userId: user.id },
      },
      select: { id: true },
    });

    return !!member;
  } catch {
    return false;
  }
}

async function handleConnection(socket: WebSocket, request: IncomingMessage) {
  const url = new URL(request.url ?? "/", "http://localhost");

  const roomName = decodeURIComponent(url.pathname.replace("/collab/", ""));

  if (!roomName) {
    socket.close();
    return;
  }

  const allowed = await verifyCollabAccess(request, url.searchParams.get("token"), roomName);

  if (!allowed) {
    console.warn(`Collab upgrade denied for room: ${roomName}`);
    socket.close();
    return;
  }

  const room = getCollabRoom(roomName);

  room.connections.add(socket);

  room.connectionClients.set(socket, new Set());

  const awarenessClients = [...room.awareness.getStates().keys()];

  if (awarenessClients.length > 0) {
    socket.send(createAwarenessMessage(room.awareness, awarenessClients));
  }

  socket.on("message", (rawMessage: Buffer) => {
    const data = new Uint8Array(rawMessage);

    const decoder = decoding.createDecoder(data);

    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        const encoder = encoding.createEncoder();

        encoding.writeVarUint(encoder, messageSync);

        const syncType = syncProtocol.readSyncMessage(decoder, encoder, room.doc, socket);

        const response = encoding.toUint8Array(encoder);

        if (response.length > 1) {
          socket.send(response);
        }

        if (syncType === syncProtocol.messageYjsSyncStep1) {
          socket.send(
            createSyncMessage(room.doc, (e) => {
              syncProtocol.writeSyncStep1(e, room.doc);
            })
          );
        }

        break;
      }

      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          socket
        );

        break;
      }

      case messageQueryAwareness: {
        const clients = [...room.awareness.getStates().keys()];

        if (clients.length > 0) {
          socket.send(createAwarenessMessage(room.awareness, clients));
        }

        break;
      }
    }
  });

  socket.on("close", () => {
    disposeCollabConnection(roomName, socket);
  });

  socket.on("error", () => {
    disposeCollabConnection(roomName, socket);
  });
}
