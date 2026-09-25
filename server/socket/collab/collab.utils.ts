import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";

export const messageSync = 0;
export const messageAwareness = 1;
export const messageQueryAwareness = 3;

export function createSyncMessage(_doc: Y.Doc, write: (encoder: encoding.Encoder) => void) {
  const encoder = encoding.createEncoder();

  encoding.writeVarUint(encoder, messageSync);

  write(encoder);

  return encoding.toUint8Array(encoder);
}

export function createAwarenessMessage(awareness: Awareness, clientIds: number[]) {
  const encoder = encoding.createEncoder();

  encoding.writeVarUint(encoder, messageAwareness);

  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, clientIds)
  );

  return encoding.toUint8Array(encoder);
}

export { awarenessProtocol, syncProtocol };
