"use client";

import { useEffect, useRef, useState } from "react";

import * as Y from "yjs";

import { WebsocketProvider } from "y-websocket";

import type { MetaValue } from "./collab-utils";

export type SessionShape = {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  fragment: Y.XmlFragment;
  meta: Y.Map<MetaValue>;
};

export function buildNullSession(): SessionShape {
  const doc = new Y.Doc();

  return {
    doc,
    provider: null,
    fragment: doc.getXmlFragment("document"),
    meta: doc.getMap<MetaValue>("meta"),
  };
}

export function useCollabSession(
  roomName: string,
  resolvedServerUrl: string | null,
  getToken: () => Promise<string | null>
) {
  const [session, setSession] = useState<SessionShape>(() => buildNullSession());
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let cancelled = false;
    let current: SessionShape | null = null;

    async function setup() {
      const token = await getTokenRef.current().catch(() => null);

      if (cancelled) {
        return;
      }

      const doc = new Y.Doc();

      const provider = resolvedServerUrl
        ? new WebsocketProvider(resolvedServerUrl, roomName, doc, {
            params: token ? { token } : {},
          })
        : null;

      current = {
        doc,
        provider,
        fragment: doc.getXmlFragment("document"),
        meta: doc.getMap<MetaValue>("meta"),
      };

      setSession(current);
    }

    void setup();

    return () => {
      cancelled = true;
      current?.provider?.awareness.setLocalState(null);
      current?.provider?.destroy();
      current?.doc.destroy();
    };
  }, [roomName, resolvedServerUrl]);

  return session;
}
