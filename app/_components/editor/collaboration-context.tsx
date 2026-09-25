"use client";

import type { Block } from "@blocknote/core";
import { useAuth, useUser } from "@clerk/nextjs";
import { createContext, useContext, useMemo } from "react";

import * as Y from "yjs";

import {
  getColorSeed,
  getDisplayName,
  getRoomName,
  type CollaborationUser,
  type MetaValue,
} from "./collab-utils";
import { useCollabSession, type SessionShape } from "./collab-session";
import { useCollabProviderSync } from "./use-collab-sync";

export type EditorContext = {
  entityType: "DOCUMENT" | "TASK";
  entityId: string;
  workspaceId: string;
};

export type { CollaborationUser };

export type CollaborationContextValue = {
  doc: Y.Doc;
  provider: import("y-websocket").WebsocketProvider | null;
  fragment: Y.XmlFragment;
  meta: Y.Map<MetaValue>;
  entityType: "DOCUMENT" | "TASK";
  entityId: string;
  workspaceId: string;
  roomName: string;
  mode: "collaborative" | "local";
  status: "connecting" | "connected" | "disconnected";
  synced: boolean;
  editorReady: boolean;
  shouldBootstrapContent: boolean;
  localUser: {
    name: string;
    color: string;
  };
  activeUsers: CollaborationUser[];
};

export const CollaborationContext = createContext<CollaborationContextValue | null>(null);

export type ProviderProps = {
  context: EditorContext;
  initialContent?: Block[];
  initialMeta?: Record<string, MetaValue | undefined>;
  children: React.ReactNode;
};

export function EditorCollaborationProvider({
  context,
  initialContent,
  initialMeta,
  children,
}: ProviderProps) {
  const { user } = useUser();
  const { getToken } = useAuth();

  const roomName = useMemo(
    () => getRoomName(context.entityType, context.entityId),
    [context.entityId, context.entityType]
  );

  const localUser = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? null;

    return {
      name: getDisplayName(user?.fullName, email),
      color: getColorSeed(user?.id ?? roomName),
    };
  }, [roomName, user?.fullName, user?.id, user?.primaryEmailAddress]);

  const resolvedServerUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";

    return `${protocol}://${window.location.host}/collab`;
  }, []);

  const session: SessionShape = useCollabSession(roomName, resolvedServerUrl, getToken);

  const mode: "collaborative" | "local" = resolvedServerUrl ? "collaborative" : "local";

  const { status, synced, hasConnectedOnce, hasSyncedOnce, shouldBootstrapContent, activeUsers } =
    useCollabProviderSync({
      session,
      initialContentLength: initialContent?.length ?? 0,
      initialMeta,
      localUser,
      user: user ? { id: user.id, imageUrl: user.imageUrl } : null,
    });

  const value = useMemo<CollaborationContextValue>(
    () => ({
      ...session,
      entityId: context.entityId,
      entityType: context.entityType,
      workspaceId: context.workspaceId,
      roomName,
      mode,
      status,
      synced,
      editorReady: mode === "local" || hasConnectedOnce || hasSyncedOnce,
      shouldBootstrapContent,
      localUser,
      activeUsers,
    }),
    [
      session,
      context.entityId,
      context.entityType,
      context.workspaceId,
      roomName,
      mode,
      status,
      synced,
      hasConnectedOnce,
      hasSyncedOnce,
      shouldBootstrapContent,
      localUser,
      activeUsers,
    ]
  );

  return <CollaborationContext.Provider value={value}>{children}</CollaborationContext.Provider>;
}

export function useEditorCollaboration() {
  const context = useContext(CollaborationContext);

  if (!context) {
    throw new Error("useEditorCollaboration must be used within EditorCollaborationProvider");
  }

  return context;
}
