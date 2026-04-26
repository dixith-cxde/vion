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
  useSyncExternalStore,
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
type CollaborationServerSnapshot = {
  enabled: boolean;
  resolved: boolean;
  url: string | null;
};

const CollaborationContext = createContext<CollaborationContextValue | null>(
  null,
);

const COLLAB_SERVER_PORT = "1234";
const EMPTY_SERVER_SNAPSHOT: CollaborationServerSnapshot = {
  enabled: false,
  resolved: false,
  url: null,
};
const collaborationServerListeners = new Set<() => void>();
let collaborationServerSnapshot = EMPTY_SERVER_SNAPSHOT;
let collaborationServerResolvePromise: Promise<void> | null = null;
let collaborationServerRetryTimeout: number | null = null;

function emitCollaborationServerSnapshot(
  nextSnapshot: CollaborationServerSnapshot,
) {
  if (
    collaborationServerSnapshot.enabled === nextSnapshot.enabled &&
    collaborationServerSnapshot.resolved === nextSnapshot.resolved &&
    collaborationServerSnapshot.url === nextSnapshot.url
  ) {
    return;
  }

  collaborationServerSnapshot = nextSnapshot;
  collaborationServerListeners.forEach((listener) => listener());
}

function subscribeToCollaborationServer(listener: () => void) {
  collaborationServerListeners.add(listener);
  return () => {
    collaborationServerListeners.delete(listener);
  };
}

function getCollaborationServerSnapshot() {
  return collaborationServerSnapshot;
}

function getServerCollaborationServerSnapshot() {
  return EMPTY_SERVER_SNAPSHOT;
}

function getCollaborationServerUrlCandidates() {
  const configuredUrl = process.env.NEXT_PUBLIC_YJS_WS_URL?.trim();
  if (configuredUrl) {
    return [configuredUrl];
  }

  if (typeof window === "undefined") {
    return [];
  }

  if (process.env.NODE_ENV !== "development") {
    return [];
  }

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const hostCandidates = new Set([window.location.hostname]);

  if (window.location.hostname === "localhost") {
    hostCandidates.add("127.0.0.1");
  }

  if (window.location.hostname === "127.0.0.1") {
    hostCandidates.add("localhost");
  }

  return Array.from(
    hostCandidates,
    (hostname) => `${protocol}://${hostname}:${COLLAB_SERVER_PORT}`,
  );
}

function toHealthCheckUrl(serverUrl: string) {
  const healthProtocol = serverUrl.startsWith("wss://")
    ? "https://"
    : "http://";
  return `${healthProtocol}${serverUrl.replace(/^wss?:\/\//, "")}/health`;
}

async function isCollaborationServerReachable(serverUrl: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(toHealthCheckUrl(serverUrl), {
      cache: "no-store",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

function scheduleCollaborationServerRetry() {
  if (
    typeof window === "undefined" ||
    collaborationServerRetryTimeout !== null
  ) {
    return;
  }

  collaborationServerRetryTimeout = window.setTimeout(() => {
    collaborationServerRetryTimeout = null;
    void ensureCollaborationServerUrl();
  }, 1000);
}

async function ensureCollaborationServerUrl() {
  if (typeof window === "undefined") {
    return;
  }

  const candidates = getCollaborationServerUrlCandidates();
  if (candidates.length === 0) {
    emitCollaborationServerSnapshot({
      enabled: false,
      resolved: true,
      url: null,
    });
    return;
  }

  if (collaborationServerSnapshot.url) {
    return;
  }

  emitCollaborationServerSnapshot({
    enabled: true,
    resolved: false,
    url: null,
  });

  if (collaborationServerResolvePromise) {
    return collaborationServerResolvePromise;
  }

  collaborationServerResolvePromise = (async () => {
    for (const candidate of candidates) {
      const isReachable = await isCollaborationServerReachable(candidate);
      if (!isReachable) {
        continue;
      }

      emitCollaborationServerSnapshot({
        enabled: true,
        resolved: true,
        url: candidate,
      });
      collaborationServerResolvePromise = null;
      return;
    }

    collaborationServerResolvePromise = null;
    scheduleCollaborationServerRetry();
  })();

  return collaborationServerResolvePromise;
}

function getRoomName(
  entityType: EditorContext["entityType"],
  entityId: string,
) {
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

function areUsersEqual(left: CollaborationUser[], right: CollaborationUser[]) {
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
    const isGuest = user.id.startsWith("guest");
    const existing = uniqueUsers.get(user.id);

    if (!existing) {
      // Skip guest ONLY if you want strict filtering
      if (isGuest) continue;

      uniqueUsers.set(user.id, user);
      continue;
    }

    // Case 2: existing user, merge safely
    uniqueUsers.set(user.id, {
      ...existing,
      ...user,
      imageUrl: user.imageUrl ?? existing.imageUrl,
    });
  }

  return Array.from(uniqueUsers.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
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
  const collaborationServer = useSyncExternalStore(
    subscribeToCollaborationServer,
    getCollaborationServerSnapshot,
    getServerCollaborationServerSnapshot,
  );
  const serverUrl = collaborationServer.url;
  const hasResolvedServerUrl = collaborationServer.resolved;
  const mode: CollaborationMode =
    collaborationServer.enabled || serverUrl ? "collaborative" : "local";
  const [status, setStatus] =
    useState<CollaborationContextValue["status"]>("connecting");
  const [synced, setSynced] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);
  const [shouldBootstrapContent, setShouldBootstrapContent] = useState(false);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const isMountedRef = useRef(false);
  const initialContentRef = useRef(initialContent);
  const initialMetaRef = useRef(initialMeta);

  const localUser = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? null;

    return {
      name: getDisplayName(user?.fullName, email),
      color: getColorSeed(user?.id ?? roomName),
    };
  }, [roomName, user?.fullName, user?.id, user?.primaryEmailAddress]);

  // At the top of EditorCollaborationProvider, before the session memo
  const [resolvedServerUrl, setResolvedServerUrl] = useState<string | null>(
    null,
  );
  const [serverResolved, setServerResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const candidates = getCollaborationServerUrlCandidates();

      if (candidates.length === 0) {
        if (!cancelled) {
          setResolvedServerUrl(null);
          setServerResolved(true);
        }
        return;
      }

      for (const candidate of candidates) {
        const reachable = await isCollaborationServerReachable(candidate);
        if (cancelled) return;
        if (reachable) {
          setResolvedServerUrl(candidate);
          setServerResolved(true);
          return;
        }
      }

      if (!cancelled) {
        setResolvedServerUrl(null);
        setServerResolved(true);
      }
    }

    void resolve();

    return () => {
      cancelled = true;
    };
  }, []);

  const nullSession = useMemo(() => {
    const doc = new Y.Doc();
    return {
      doc,
      provider: null,
      fragment: doc.getXmlFragment("document"),
      meta: doc.getMap<MetaValue>("meta"),
    };
  }, []);

  const activeSession = useMemo(() => {
    if (!serverResolved) return null;

    const doc = new Y.Doc();
    const provider = resolvedServerUrl
      ? new WebsocketProvider(resolvedServerUrl, roomName, doc)
      : null;

    return {
      doc,
      provider,
      fragment: doc.getXmlFragment("document"),
      meta: doc.getMap<MetaValue>("meta"),
    };
  }, [roomName, resolvedServerUrl, serverResolved]);
  // const session = useMemo(() => {
  //   const doc = new Y.Doc();

  //   // Only create provider if serverUrl is actually resolved
  //   const resolvedUrl = serverUrl ?? null;
  //   const provider = resolvedUrl
  //     ? new WebsocketProvider(resolvedUrl, roomName, doc)
  //     : null;

  //   return {
  //     doc,
  //     provider,
  //     fragment: doc.getXmlFragment("document"),
  //     meta: doc.getMap<MetaValue>("meta"),
  //   };
  // }, [roomName, serverUrl]); // serverUrl is now only set after resolution

  const session = activeSession ?? nullSession;

  useEffect(() => {
    isMountedRef.current = true;
    void ensureCollaborationServerUrl();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  useEffect(() => {
    initialMetaRef.current = initialMeta;
  }, [initialMeta]);

  useEffect(() => {
    const scheduleStateUpdate = (callback: () => void) => {
      queueMicrotask(() => {
        if (!isMountedRef.current) return;
        callback();
      });
    };

    if (!hasResolvedServerUrl) {
      scheduleStateUpdate(() => {
        setStatus("connecting");
        setSynced(false);
        setHasConnectedOnce(false);
        setHasSyncedOnce(false);
        setShouldBootstrapContent(false);
        setActiveUsers([]);
      });
      return;
    }

    scheduleStateUpdate(() => {
      setStatus(mode === "collaborative" ? "connecting" : "disconnected");
      setSynced(mode === "local");
      setHasConnectedOnce(mode === "local");
      setHasSyncedOnce(mode === "local");
      setShouldBootstrapContent(
        mode === "local" && (initialContentRef.current?.length ?? 0) > 0,
      );
      setActiveUsers([]);
    });

    if (!session.provider) {
      const seedMeta = initialMetaRef.current;

      if (
        session.meta.size === 0 &&
        seedMeta &&
        Object.keys(seedMeta).length > 0
      ) {
        session.doc.transact(() => {
          for (const [key, value] of toMetaEntries(seedMeta)) {
            session.meta.set(key, value);
          }
        });
      }

      return () => {
        session.doc.destroy();
      };
    }

    const provider = session.provider;

    const handleStatus = ({
      status: nextStatus,
    }: {
      status: CollaborationContextValue["status"];
    }) => {
      scheduleStateUpdate(() => {
        if (nextStatus === "connected") {
          setHasConnectedOnce(true);
        }

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
          fragmentIsEmpty && (initialContentRef.current?.length ?? 0) > 0;

        setShouldBootstrapContent((currentValue) =>
          currentValue === nextShouldBootstrap
            ? currentValue
            : nextShouldBootstrap,
        );

        const seedMeta = initialMetaRef.current;

        if (
          session.meta.size === 0 &&
          seedMeta &&
          Object.keys(seedMeta).length > 0
        ) {
          session.doc.transact(() => {
            for (const [key, value] of toMetaEntries(seedMeta)) {
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

            if (
              !awarenessUser ||
              typeof awarenessUser !== "object" ||
              typeof awarenessUser.id !== "string"
            ) {
              return null;
            }

            const id = awarenessUser.id;
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
      console.log({ users });

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
  }, [hasResolvedServerUrl, mode, session]);

  useEffect(() => {
    if (session.provider) {
      if (!user) return;
      session.provider.awareness.setLocalStateField("user", {
        id: user.id,
        name: localUser.name,
        color: localUser.color,
        imageUrl: user?.imageUrl ?? null,
      });
      return;
    }

    // ONLY for true local mode
    if (mode !== "local") return;

    // setActiveUsers([
    //   {
    //     clientId: session.doc.clientID,
    //     id: user?.id ?? `guest-${session.doc.clientID}`,
    //     name: localUser.name,
    //     color: localUser.color,
    //     imageUrl: user?.imageUrl ?? null,
    //   },
    // ]);
    // if (!hasResolvedServerUrl) {
    //   return;
    // }

    // queueMicrotask(() => {
    //   if (!isMountedRef.current) return;

    //   setActiveUsers((currentUsers) => {
    //     const nextUsers = dedupeUsers([
    //       {
    //         clientId: session.doc.clientID,
    //         id: user?.id ?? `guest-${session.doc.clientID}`,
    //         name: localUser.name,
    //         color: localUser.color,
    //         imageUrl: user?.imageUrl ?? null,
    //       },
    //     ]);

    //     return areUsersEqual(currentUsers, nextUsers)
    //       ? currentUsers
    //       : nextUsers;
    //   });
    // });
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
      editorReady:
        serverResolved &&
        session !== null &&
        (mode === "local" || hasConnectedOnce || hasSyncedOnce),
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
      hasConnectedOnce,
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
