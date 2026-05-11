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

const CollaborationContext = createContext<CollaborationContextValue | null>(null);

function getRoomName(entityType: EditorContext["entityType"], entityId: string) {
  return `${entityType === "DOCUMENT" ? "doc" : "task"}-${entityId}`;
}

function getDisplayName(fullName: string | null | undefined, email: string | null | undefined) {
  if (fullName?.trim()) {
    return fullName.trim();
  }

  if (email?.trim()) {
    return email.split("@")[0] ?? email.trim();
  }

  return "User";
}

function getColorSeed(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }

  return `hsl(${Math.abs(hash) % 360} 72% 52%)`;
}

function toMetaEntries(values: Record<string, MetaValue | undefined>): Array<[string, MetaValue]> {
  return Object.entries(values).flatMap(([k, v]) => (v === undefined ? [] : [[k, v]]));
}

function readMetaMap<T extends Record<string, MetaValue>>(map: Y.Map<MetaValue>, fallback: T): T {
  const next = { ...fallback } as T;

  for (const [k, v] of map.entries()) {
    (next as Record<string, MetaValue>)[k] = v;
  }

  return next;
}

function areUsersEqual(a: CollaborationUser[], b: CollaborationUser[]) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((u, i) => {
    const v = b[i];

    return (
      v && u.clientId === v.clientId && u.id === v.id && u.name === v.name && u.color === v.color
    );
  });
}

function dedupeUsers(users: CollaborationUser[]): CollaborationUser[] {
  const map = new Map<string, CollaborationUser>();

  for (const user of users) {
    const existing = map.get(user.id);

    if (!existing) {
      map.set(user.id, user);
    } else {
      map.set(user.id, {
        ...existing,
        ...user,
        imageUrl: user.imageUrl ?? existing.imageUrl,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

type SessionShape = {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  fragment: Y.XmlFragment;
  meta: Y.Map<MetaValue>;
};

function buildNullSession(): SessionShape {
  const doc = new Y.Doc();

  return {
    doc,
    provider: null,
    fragment: doc.getXmlFragment("document"),
    meta: doc.getMap<MetaValue>("meta"),
  };
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

  const serverResolved = true;

  const sessionRef = useRef<SessionShape>(buildNullSession());

  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    if (!serverResolved) {
      return;
    }

    const doc = new Y.Doc();

    const provider = resolvedServerUrl
      ? new WebsocketProvider(resolvedServerUrl, roomName, doc)
      : null;

    const next: SessionShape = {
      doc,
      provider,
      fragment: doc.getXmlFragment("document"),
      meta: doc.getMap<MetaValue>("meta"),
    };

    sessionRef.current = next;

    setSessionTick((t) => t + 1);

    return () => {
      provider?.awareness.setLocalState(null);

      provider?.destroy();

      doc.destroy();

      sessionRef.current = buildNullSession();
    };
  }, [roomName, resolvedServerUrl, serverResolved]);

  const session = useMemo(() => sessionRef.current, [sessionTick]);

  const mode: "collaborative" | "local" = resolvedServerUrl ? "collaborative" : "local";

  const [status, setStatus] = useState<CollaborationContextValue["status"]>("connecting");

  const [synced, setSynced] = useState(false);

  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);

  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);

  const [shouldBootstrapContent, setShouldBootstrapContent] = useState(false);

  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);

  const initialContentRef = useRef(initialContent);

  const initialMetaRef = useRef(initialMeta);

  const isMountedRef = useRef(true);

  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    initialMetaRef.current = initialMeta;
  }, [initialMeta]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const localUserRef = useRef(localUser);

  useEffect(() => {
    localUserRef.current = localUser;
  }, [localUser]);

  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const { provider, doc, fragment, meta } = session;

    if (!provider) {
      setStatus("disconnected");

      setSynced(true);

      setHasConnectedOnce(true);

      setHasSyncedOnce(true);

      setShouldBootstrapContent((initialContentRef.current?.length ?? 0) > 0);

      const seedMeta = initialMetaRef.current;

      if (meta.size === 0 && seedMeta && Object.keys(seedMeta).length > 0) {
        doc.transact(() => {
          for (const [k, v] of toMetaEntries(seedMeta)) {
            meta.set(k, v);
          }
        });
      }

      return;
    }

    function setLocalAwareness() {
      const currentUser = userRef.current;

      const currentLocalUser = localUserRef.current;

      if (!currentUser || !provider) {
        return;
      }

      provider.awareness.setLocalStateField("user", {
        id: currentUser.id,
        name: currentLocalUser.name,
        color: currentLocalUser.color,
        imageUrl: currentUser.imageUrl ?? null,
      });
    }

    function readAwarenessUsers(): CollaborationUser[] {
      if (!provider) {
        return [];
      }

      return dedupeUsers(
        Array.from(provider.awareness.getStates().entries())
          .map(([clientId, state]) => {
            if (!state || typeof state !== "object" || !("user" in state)) {
              return null;
            }

            const awarenessUser = (
              state as {
                user?: Record<string, unknown>;
              }
            ).user;

            if (!awarenessUser || typeof awarenessUser.id !== "string") {
              return null;
            }

            if ((awarenessUser.id as string).startsWith("guest")) {
              return null;
            }

            return {
              clientId,
              id: awarenessUser.id as string,
              name: typeof awarenessUser.name === "string" ? awarenessUser.name : "User",
              color: typeof awarenessUser.color === "string" ? awarenessUser.color : "#3b82f6",
              imageUrl: typeof awarenessUser.imageUrl === "string" ? awarenessUser.imageUrl : null,
            } satisfies CollaborationUser;
          })
          .filter((value): value is CollaborationUser => value !== null)
      );
    }

    setLocalAwareness();

    const handleStatus = ({
      status: nextStatus,
    }: {
      status: CollaborationContextValue["status"];
    }) => {
      if (!isMountedRef.current) {
        return;
      }

      if (nextStatus === "connected") {
        setHasConnectedOnce(true);

        setLocalAwareness();
      }

      setStatus(nextStatus);
    };

    const handleSync = (isSynced: boolean) => {
      if (!isMountedRef.current) {
        return;
      }

      setSynced(isSynced);

      if (isSynced) {
        setHasSyncedOnce(true);

        setLocalAwareness();

        const isEmpty = fragment.toArray().length === 0;

        setShouldBootstrapContent(isEmpty && (initialContentRef.current?.length ?? 0) > 0);

        const seedMeta = initialMetaRef.current;

        if (meta.size === 0 && seedMeta && Object.keys(seedMeta).length > 0) {
          doc.transact(() => {
            for (const [k, v] of toMetaEntries(seedMeta)) {
              meta.set(k, v);
            }
          });
        }
      } else {
        setShouldBootstrapContent(false);
      }
    };

    const handleAwareness = () => {
      if (!isMountedRef.current) {
        return;
      }

      queueMicrotask(() => {
        if (!isMountedRef.current) {
          return;
        }

        const users = readAwarenessUsers();

        setActiveUsers((current) => (areUsersEqual(current, users) ? current : users));
      });
    };

    const heartbeat = window.setInterval(() => {
      if (provider.wsconnected) {
        setLocalAwareness();
      }
    }, 8000);

    provider.on("status", handleStatus);

    provider.on("sync", handleSync);

    provider.awareness.on("change", handleAwareness);

    handleStatus({
      status: provider.wsconnected
        ? "connected"
        : provider.wsconnecting
          ? "connecting"
          : "disconnected",
    });

    handleSync(provider.synced);

    queueMicrotask(handleAwareness);

    if (!provider.wsconnected && !provider.wsconnecting && provider.shouldConnect) {
      provider.connect();
    }

    return () => {
      window.clearInterval(heartbeat);

      provider.off("status", handleStatus);

      provider.off("sync", handleSync);

      provider.awareness.off("change", handleAwareness);
    };
  }, [session]);

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
      editorReady: serverResolved && (mode === "local" || hasConnectedOnce || hasSyncedOnce),
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
      serverResolved,
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

export function useCollaborativeMeta<T extends Record<string, MetaValue>>(initialMeta: T) {
  const { doc, meta, synced } = useEditorCollaboration();

  const [state, setState] = useState(initialMeta);

  const initialMetaRef = useRef(initialMeta);

  useEffect(() => {
    initialMetaRef.current = initialMeta;
  }, [initialMeta]);

  useEffect(() => {
    const update = () => {
      const next = readMetaMap(meta, initialMetaRef.current);

      setState((current) => {
        const changed = Object.entries(next).some(([k, v]) => current[k as keyof T] !== v);

        return changed ? next : current;
      });
    };

    update();

    meta.observe(update);

    return () => {
      meta.unobserve(update);
    };
  }, [meta]);

  const updateMeta = useCallback(
    (patch: Partial<T>) => {
      doc.transact(() => {
        for (const [k, v] of toMetaEntries(patch)) {
          meta.set(k, v);
        }
      });
    },
    [doc, meta]
  );

  return {
    meta: state,
    updateMeta,
    synced,
  };
}
