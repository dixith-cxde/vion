import { WebSocket } from "ws";
import * as Y from "yjs";
import type { CollabRoom } from "@/types/collab.types";

import {
  awarenessProtocol,
  createAwarenessMessage,
  createSyncMessage,
  syncProtocol,
} from "./collab.utils";

const rooms = new Map<string, CollabRoom>();

function sendMessage(socket: WebSocket, payload: Uint8Array) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(payload);
  }
}

function broadcast(room: CollabRoom, payload: Uint8Array, exclude?: WebSocket) {
  room.connections.forEach((connection) => {
    if (connection !== exclude) {
      sendMessage(connection, payload);
    }
  });
}

export function getCollabRoom(name: string) {
  const existing = rooms.get(name);

  if (existing) {
    return existing;
  }

  const doc = new Y.Doc();

  const awareness = new awarenessProtocol.Awareness(doc);

  const room: CollabRoom = {
    doc,
    awareness,
    connections: new Set(),
    connectionClients: new Map(),
  };

  doc.on("update", (update, origin) => {
    const payload = createSyncMessage(doc, (encoder) => {
      syncProtocol.writeUpdate(encoder, update);
    });

    broadcast(room, payload, origin as WebSocket);
  });

  awareness.on("update", ({ added, updated, removed }, origin) => {
    const changedClients = [...added, ...updated, ...removed];

    if (changedClients.length === 0) {
      return;
    }

    if (origin instanceof WebSocket) {
      const tracked = room.connectionClients.get(origin) ?? new Set<number>();

      for (const clientId of added) {
        tracked.add(clientId);
      }

      for (const clientId of removed) {
        tracked.delete(clientId);
      }

      room.connectionClients.set(origin, tracked);
    }

    broadcast(room, createAwarenessMessage(room.awareness, changedClients));
  });

  rooms.set(name, room);

  return room;
}

export function disposeCollabConnection(roomName: string, socket: WebSocket) {
  const room = rooms.get(roomName);

  if (!room) {
    return;
  }

  room.connections.delete(socket);

  const trackedClients = room.connectionClients.get(socket);

  if (trackedClients && trackedClients.size > 0) {
    awarenessProtocol.removeAwarenessStates(room.awareness, [...trackedClients], socket);
  }

  room.connectionClients.delete(socket);

  if (room.connections.size === 0) {
    room.awareness.destroy();
    room.doc.destroy();

    rooms.delete(roomName);
  }
}
