import type { Awareness } from "y-protocols/awareness";
import type { WebSocket } from "ws";
import type * as Y from "yjs";

export type CollabRoom = {
  doc: Y.Doc;
  awareness: Awareness;
  connections: Set<WebSocket>;
  connectionClients: Map<WebSocket, Set<number>>;
};
