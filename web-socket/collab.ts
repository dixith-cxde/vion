import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const messageSync = 0;
const messageAwareness = 1;
const messageQueryAwareness = 3;

type Room = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  connections: Set<WebSocket>;
  connectionClients: Map<WebSocket, Set<number>>;
};

type AwarenessUpdate = {
  added: number[];
  updated: number[];
  removed: number[];
};

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const rooms = new Map<string, Room>();

function sendMessage(socket: WebSocket, payload: Uint8Array) {
  if (socket.readyState === socket.OPEN) {
    socket.send(payload);
  }
}

function broadcast(room: Room, payload: Uint8Array, exclude?: WebSocket) {
  room.connections.forEach((connection) => {
    if (connection !== exclude) {
      sendMessage(connection, payload);
    }
  });
}

function createSyncMessage(doc: Y.Doc, write: (encoder: encoding.Encoder) => void) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  write(encoder);
  return encoding.toUint8Array(encoder);
}

function createAwarenessMessage(
  awareness: awarenessProtocol.Awareness,
  clientIds: number[],
) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageAwareness);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, clientIds),
  );
  return encoding.toUint8Array(encoder);
}

function getRoom(name: string) {
  const existing = rooms.get(name);
  if (existing) {
    return existing;
  }

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  const room: Room = {
    doc,
    awareness,
    connections: new Set(),
    connectionClients: new Map(),
  };

  doc.on("update", (update, origin) => {
    const payload = createSyncMessage(doc, (encoder) => {
      syncProtocol.writeUpdate(encoder, update);
    });

    broadcast(room, payload, origin instanceof WebSocket ? origin : undefined);
  });

  awareness.on("update", ({ added, updated, removed }: AwarenessUpdate, origin: unknown) => {
    const changedClients = [...added, ...updated, ...removed];

    if (changedClients.length === 0) {
      return;
    }

    if (origin instanceof WebSocket) {
      const trackedClients =
        room.connectionClients.get(origin) ?? new Set<number>();

      for (const clientId of added) {
        trackedClients.add(clientId);
      }

      for (const clientId of removed) {
        trackedClients.delete(clientId);
      }

      room.connectionClients.set(origin, trackedClients);
    }

    broadcast(room, createAwarenessMessage(awareness, changedClients));
  });

  rooms.set(name, room);
  return room;
}

function disposeConnection(roomName: string, socket: WebSocket) {
  const room = rooms.get(roomName);
  if (!room) {
    return;
  }

  room.connections.delete(socket);
  const trackedClients = room.connectionClients.get(socket);

  if (trackedClients && trackedClients.size > 0) {
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      Array.from(trackedClients),
      socket,
    );
  }

  room.connectionClients.delete(socket);

  if (room.connections.size === 0) {
    room.awareness.destroy();
    room.doc.destroy();
    rooms.delete(roomName);
  }
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
  });
});

wss.on("connection", (socket, request) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const roomName = decodeURIComponent(url.pathname.slice(1));

  if (!roomName) {
    socket.close();
    return;
  }

  const room = getRoom(roomName);
  room.connections.add(socket);
  room.connectionClients.set(socket, new Set());

  const awarenessClients = Array.from(room.awareness.getStates().keys());
  if (awarenessClients.length > 0) {
    sendMessage(socket, createAwarenessMessage(room.awareness, awarenessClients));
  }

  socket.on("message", (rawMessage) => {
    const data =
      rawMessage instanceof Uint8Array
        ? rawMessage
        : new Uint8Array(rawMessage as ArrayBuffer);
    const decoder = decoding.createDecoder(data);
    const messageType = decoding.readVarUint(decoder);

    switch (messageType) {
      case messageSync: {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        const syncType = syncProtocol.readSyncMessage(
          decoder,
          encoder,
          room.doc,
          socket,
        );

        const response = encoding.toUint8Array(encoder);
        if (response.length > 1) {
          sendMessage(socket, response);
        }

        if (syncType === syncProtocol.messageYjsSyncStep1) {
          sendMessage(
            socket,
            createSyncMessage(room.doc, (replyEncoder) => {
              syncProtocol.writeSyncStep1(replyEncoder, room.doc);
            }),
          );
        }
        break;
      }

      case messageAwareness: {
        awarenessProtocol.applyAwarenessUpdate(
          room.awareness,
          decoding.readVarUint8Array(decoder),
          socket,
        );
        break;
      }

      case messageQueryAwareness: {
        const clientIds = Array.from(room.awareness.getStates().keys());
        if (clientIds.length > 0) {
          sendMessage(socket, createAwarenessMessage(room.awareness, clientIds));
        }
        break;
      }

      default:
        break;
    }
  });

  socket.on("close", () => {
    disposeConnection(roomName, socket);
  });

  socket.on("error", () => {
    disposeConnection(roomName, socket);
  });
});

const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? "1234");

server.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "localhost" : host;
  console.log(`Yjs collaboration server running on ws://${displayHost}:${port}`);
});
