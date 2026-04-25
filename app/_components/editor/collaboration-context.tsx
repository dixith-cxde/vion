"use client";

import type { Block } from "@blocknote/core";
import { useUser } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

type EditorContext = {
  entityType: "DOCUMENT" | "TASK";
  entityId: string;
  workspaceId: string;
};

type MetaValue = string | number | boolean | null;

type CollaborationUser = {
  clientId: number;
  id: string;
  name: string;
  color: string;
  imageUrl: string | null;
};

type CollaborationContextValue = {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  fragment: Y.XmlFragment;
  meta: Y.Map<MetaValue>;
  entityType: EditorContext["entityType"];
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

type CollaborationMode = CollaborationContextValue["mode"];

const CollaborationContext = createContext<CollaborationContextValue | null>(
  null,
);

function getCollaborationServerUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_YJS_WS_URL?.trim();
  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.hostname}:1234`;
}

function getRoomName(entityType: EditorContext["entityType"], entityId: string) {
  return `${entityType === "DOCUMENT" ? "doc" : "task"}-${entityId}`;
}

function getDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined,
) {
  return fullName?.trim() || email?.trim() || "User";
}

function getColorSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 52%)`;
}

function toMetaEntries(
  values: Record<string, MetaValue | undefined>,
): Array<[string, MetaValue]> {
  return Object.entries(values).flatMap(([key, value]) =>
    value === undefined ? [] : [[key, value]],
  );
}

function readMetaMap<T extends Record<string, MetaValue>>(
  map: Y.Map<MetaValue>,
  fallback: T,
) {
  const next = { ...fallback } as T;

  for (const [key, value] of map.entries()) {
    (next as Record<string, MetaValue>)[key] = value;
  }

  return next;
}

function areUsersEqual(
  left: CollaborationUser[],
  right: CollaborationUser[],
) {
  if (left.length !== right.length) return false;

  return left.every((user, index) => {
    const comparison = right[index];

    return (
      comparison &&
      user.clientId === comparison.clientId &&
      user.id === comparison.id &&
      user.name === comparison.name &&
      user.color === comparison.color &&
      user.imageUrl === comparison.imageUrl
    );
  });
}

function dedupeUsers(users: CollaborationUser[]) {
  const uniqueUsers = new Map<string, CollaborationUser>();

  for (const user of users) {
    const currentUser = uniqueUsers.get(user.id);

    if (!currentUser) {
      uniqueUsers.set(user.id, user);
      continue;
    }

    const nextImageUrl = currentUser.imageUrl ?? user.imageUrl;

    uniqueUsers.set(user.id, {
      ...currentUser,
      imageUrl: nextImageUrl,
      name:
        currentUser.name === "User" && user.name !== "User"
          ? user.name
          : currentUser.name,
    });
  }

  return Array.from(uniqueUsers.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

type ProviderProps = {
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
  const roomName = useMemo(
    () => getRoomName(context.entityType, context.entityId),
    [context.entityId, context.entityType],
  );
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [hasResolvedServerUrl, setHasResolvedServerUrl] = useState(false);
  const mode: CollaborationMode = serverUrl ? "collaborative" : "local";
  const [status, setStatus] = useState<CollaborationContextValue["status"]>(
    "connecting",
  );
  const [synced, setSynced] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);
  const [shouldBootstrapContent, setShouldBootstrapContent] = useState(false);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const isMountedRef = useRef(false);

  const localUser = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? null;

    return {
      name: getDisplayName(user?.fullName, email),
      color: getColorSeed(user?.id ?? roomName),
    };
  }, [roomName, user?.fullName, user?.id, user?.primaryEmailAddress]);

  const session = useMemo(() => {
    const doc = new Y.Doc();
    const provider = serverUrl
      ? new WebsocketProvider(serverUrl, roomName, doc)
      : null;

    return {
      doc,
      provider,
      fragment: doc.getXmlFragment("document"),
      meta: doc.getMap<MetaValue>("meta"),
    };
  }, [roomName, serverUrl]);

  useEffect(() => {
    setServerUrl(getCollaborationServerUrl());
    setHasResolvedServerUrl(true);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!hasResolvedServerUrl) {
      setStatus("connecting");
      setSynced(false);
      setHasSyncedOnce(false);
      setShouldBootstrapContent(false);
      setActiveUsers([]);
      return;
    }

    setStatus(mode === "collaborative" ? "connecting" : "disconnected");
    setSynced(mode === "local");
    setHasSyncedOnce(mode === "local");
    setShouldBootstrapContent(
      mode === "local" && (initialContent?.length ?? 0) > 0,
    );
    setActiveUsers([]);

    if (!session.provider) {
      if (
        session.meta.size === 0 &&
        initialMeta &&
        Object.keys(initialMeta).length > 0
      ) {
        session.doc.transact(() => {
          for (const [key, value] of toMetaEntries(initialMeta)) {
            session.meta.set(key, value);
          }
        });
      }

      return () => {
        session.doc.destroy();
      };
    }

    const provider = session.provider;

    const scheduleStateUpdate = (callback: () => void) => {
      queueMicrotask(() => {
        if (!isMountedRef.current) return;
        callback();
      });
    };

    const handleStatus = ({
      status: nextStatus,
    }: {
      status: CollaborationContextValue["status"];
    }) => {
      scheduleStateUpdate(() => {
        setStatus((currentStatus) =>
          currentStatus === nextStatus ? currentStatus : nextStatus,
        );
      });
    };

    const handleSync = (isSynced: boolean) => {
      scheduleStateUpdate(() => {
        setSynced((currentSynced) =>
          currentSynced === isSynced ? currentSynced : isSynced,
        );
        if (isSynced) {
          setHasSyncedOnce(true);
        }

        if (!isSynced) {
          setShouldBootstrapContent(false);
          return;
        }

        const fragmentIsEmpty = session.fragment.toArray().length === 0;
        const nextShouldBootstrap =
          fragmentIsEmpty && (initialContent?.length ?? 0) > 0;

        setShouldBootstrapContent((currentValue) =>
          currentValue === nextShouldBootstrap
            ? currentValue
            : nextShouldBootstrap,
        );

        if (
          session.meta.size === 0 &&
          initialMeta &&
          Object.keys(initialMeta).length > 0
        ) {
          session.doc.transact(() => {
            for (const [key, value] of toMetaEntries(initialMeta)) {
              session.meta.set(key, value);
            }
          });
        }
      });
    };

    const handleAwarenessChange = () => {
      const users = dedupeUsers(
        Array.from(provider.awareness.getStates().entries())
        .map(([clientId, state]) => {
          if (!state || typeof state !== "object" || !("user" in state)) {
            return null;
          }

          const awarenessUser = (state as { user?: Record<string, unknown> })
            .user;

          if (!awarenessUser || typeof awarenessUser !== "object") {
            return null;
          }

          const id =
            typeof awarenessUser.id === "string"
              ? awarenessUser.id
              : String(clientId);
          const name =
            typeof awarenessUser.name === "string"
              ? awarenessUser.name
              : "User";
          const color =
            typeof awarenessUser.color === "string"
              ? awarenessUser.color
              : "#3b82f6";
          const imageUrl =
            typeof awarenessUser.imageUrl === "string"
              ? awarenessUser.imageUrl
              : null;

          return {
            clientId,
            id,
            name,
            color,
            imageUrl,
          } satisfies CollaborationUser;
        })
        .filter((value): value is CollaborationUser => value !== null),
      );

      scheduleStateUpdate(() => {
        setActiveUsers((currentUsers) =>
          areUsersEqual(currentUsers, users) ? currentUsers : users,
        );
      });
    };

    provider.on("status", handleStatus);
    provider.on("sync", handleSync);
    provider.awareness.on("change", handleAwarenessChange);

    handleStatus({
      status: provider.wsconnected
        ? "connected"
        : provider.wsconnecting
          ? "connecting"
          : "disconnected",
    });
    handleSync(provider.synced);
    handleAwarenessChange();

    if (
      !provider.wsconnected &&
      !provider.wsconnecting &&
      provider.shouldConnect
    ) {
      provider.connect();
    }

    return () => {
      provider.off("status", handleStatus);
      provider.off("sync", handleSync);
      provider.awareness.off("change", handleAwarenessChange);
      provider.awareness.setLocalState(null);
      provider.destroy();
      session.doc.destroy();
    };
  }, [
    hasResolvedServerUrl,
    initialContent,
    initialMeta,
    mode,
    session,
  ]);

  useEffect(() => {
    if (session.provider) {
      session.provider.awareness.setLocalStateField("user", {
        id: user?.id ?? `guest-${session.doc.clientID}`,
        name: localUser.name,
        color: localUser.color,
        imageUrl: user?.imageUrl ?? null,
      });
      return;
    }

    if (!hasResolvedServerUrl) {
      return;
    }

    queueMicrotask(() => {
      if (!isMountedRef.current) return;

      setActiveUsers((currentUsers) => {
        const nextUsers = dedupeUsers([
          {
            clientId: session.doc.clientID,
            id: user?.id ?? `guest-${session.doc.clientID}`,
            name: localUser.name,
            color: localUser.color,
            imageUrl: user?.imageUrl ?? null,
          },
        ]);

        return areUsersEqual(currentUsers, nextUsers) ? currentUsers : nextUsers;
      });
    });
  }, [
    hasResolvedServerUrl,
    localUser.color,
    localUser.name,
    session,
    user?.id,
    user?.imageUrl,
  ]);

  const value = useMemo(
    () => ({
      ...session,
      entityId: context.entityId,
      entityType: context.entityType,
      workspaceId: context.workspaceId,
      roomName,
      mode,
      status,
      synced,
      editorReady: hasResolvedServerUrl && (mode === "local" || hasSyncedOnce),
      shouldBootstrapContent,
      localUser,
      activeUsers,
    }),
    [
      activeUsers,
      context.entityId,
      context.entityType,
      context.workspaceId,
      localUser,
      mode,
      roomName,
      session,
      hasResolvedServerUrl,
      hasSyncedOnce,
      shouldBootstrapContent,
      status,
      synced,
    ],
  );

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useEditorCollaboration() {
  const context = useContext(CollaborationContext);

  if (!context) {
    throw new Error(
      "useEditorCollaboration must be used within EditorCollaborationProvider",
    );
  }

  return context;
}

export function useCollaborativeMeta<T extends Record<string, MetaValue>>(
  initialMeta: T,
) {
  const { doc, meta, synced } = useEditorCollaboration();
  const [state, setState] = useState(initialMeta);
  const initialMetaRef = useRef(initialMeta);

  useEffect(() => {
    initialMetaRef.current = initialMeta;
  }, [initialMeta]);

  useEffect(() => {
    const updateState = () => {
      const nextState = readMetaMap(meta, initialMetaRef.current);

      setState((currentState) => {
        const currentEntries = Object.entries(currentState);
        const nextEntries = Object.entries(nextState);

        if (currentEntries.length !== nextEntries.length) {
          return nextState;
        }

        const hasChanged = nextEntries.some(
          ([key, value]) => currentState[key as keyof T] !== value,
        );

        return hasChanged ? nextState : currentState;
      });
    };

    updateState();
    meta.observe(updateState);

    return () => {
      meta.unobserve(updateState);
    };
  }, [meta]);

  const updateMeta = useCallback(
    (patch: Partial<T>) => {
      doc.transact(() => {
        for (const [key, value] of toMetaEntries(patch)) {
          meta.set(key, value);
        }
      });
    },
    [doc, meta],
  );

  return {
    meta: state,
    updateMeta,
    synced,
  };
}
