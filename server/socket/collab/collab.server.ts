import { IncomingMessage } from "http";
import type { Server as HTTPServer } from "http";

import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { WebSocketServer } from "ws";

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
    handleConnection(socket, request);
  });

  return collabWss;
}

function handleConnection(socket: any, request: IncomingMessage) {
  const url = new URL(request.url ?? "/", "http://localhost");

  const roomName = decodeURIComponent(url.pathname.replace("/collab/", ""));

  if (!roomName) {
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
