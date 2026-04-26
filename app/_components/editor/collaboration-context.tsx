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
  localUser: { name: string; color: string };
  activeUsers: CollaborationUser[];
};

const CollaborationContext = createContext<CollaborationContextValue | null>(
  null,
);

const COLLAB_SERVER_PORT = "1234";

function getCollaborationServerUrlCandidates(): string[] {
  const configuredUrl = process.env.NEXT_PUBLIC_YJS_WS_URL?.trim();
  if (configuredUrl) return [configuredUrl];
  if (typeof window === "undefined") return [];
  if (process.env.NODE_ENV !== "development") return [];

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const hostCandidates = new Set([window.location.hostname]);
  if (window.location.hostname === "localhost") hostCandidates.add("127.0.0.1");
  if (window.location.hostname === "127.0.0.1") hostCandidates.add("localhost");

  return Array.from(
    hostCandidates,
    (h) => `${protocol}://${h}:${COLLAB_SERVER_PORT}`,
  );
}

async function isCollaborationServerReachable(
  serverUrl: string,
): Promise<boolean> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1500);
  const healthProtocol = serverUrl.startsWith("wss://")
    ? "https://"
    : "http://";
  const healthUrl = `${healthProtocol}${serverUrl.replace(/^wss?:\/\//, "")}/health`;
  try {
    const response = await fetch(healthUrl, {
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

function getRoomName(
  entityType: EditorContext["entityType"],
  entityId: string,
): string {
  return `${entityType === "DOCUMENT" ? "doc" : "task"}-${entityId}`;
}

function getDisplayName(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string {
  if (fullName?.trim()) return fullName.trim();
  if (email?.trim()) return email.split("@")[0] ?? email.trim();
  return "User";
}

function getColorSeed(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360} 72% 52%)`;
}

function toMetaEntries(
  values: Record<string, MetaValue | undefined>,
): Array<[string, MetaValue]> {
  return Object.entries(values).flatMap(([k, v]) =>
    v === undefined ? [] : [[k, v]],
  );
}

function readMetaMap<T extends Record<string, MetaValue>>(
  map: Y.Map<MetaValue>,
  fallback: T,
): T {
  const next = { ...fallback } as T;
  for (const [k, v] of map.entries()) {
    (next as Record<string, MetaValue>)[k] = v;
  }
  return next;
}

function areUsersEqual(
  a: CollaborationUser[],
  b: CollaborationUser[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((u, i) => {
    const v = b[i];
    return (
      v &&
      u.clientId === v.clientId &&
      u.id === v.id &&
      u.name === v.name &&
      u.color === v.color
    );
  });
}

function dedupeUsers(users: CollaborationUser[]): CollaborationUser[] {
  const map = new Map<string, CollaborationUser>();
  for (const u of users) {
    const existing = map.get(u.id);
    if (!existing) {
      map.set(u.id, u);
    } else {
      map.set(u.id, {
        ...existing,
        ...u,
        imageUrl: u.imageUrl ?? existing.imageUrl,
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
    [context.entityId, context.entityType],
  );

  const localUser = useMemo(() => {
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    return {
      name: getDisplayName(user?.fullName, email),
      color: getColorSeed(user?.id ?? roomName),
    };
  }, [roomName, user?.fullName, user?.id, user?.primaryEmailAddress]);

  // ── Step 1: resolve server URL once ──────────────────────────────────────
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

  // ── Step 2: build session after server resolves ───────────────────────────
  // Use a ref to hold the session so we never call setState synchronously
  // inside an effect body (which triggers the cascading renders warning).
  const sessionRef = useRef<SessionShape>(buildNullSession());
  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    if (!serverResolved) return;

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
    setSessionTick((t) => t + 1); // one re-render to expose new session

    return () => {
      provider?.awareness.setLocalState(null);
      provider?.destroy();
      doc.destroy();
      sessionRef.current = buildNullSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, resolvedServerUrl, serverResolved]);

  // stable derived value — never null
  // sessionTick is only here to cause a re-render when sessionRef changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const session = useMemo(() => sessionRef.current, [sessionTick]);

  const mode: "collaborative" | "local" = resolvedServerUrl
    ? "collaborative"
    : "local";

  // ── Step 3: connection state ──────────────────────────────────────────────
  const [status, setStatus] =
    useState<CollaborationContextValue["status"]>("connecting");
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

  // ── Step 4: wire provider events ─────────────────────────────────────────
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

    // ── local mode ──
    if (!provider) {
      setStatus("disconnected");
      setSynced(true);
      setHasConnectedOnce(true);
      setHasSyncedOnce(true);
      setShouldBootstrapContent((initialContentRef.current?.length ?? 0) > 0);

      const seedMeta = initialMetaRef.current;
      if (meta.size === 0 && seedMeta && Object.keys(seedMeta).length > 0) {
        doc.transact(() => {
          for (const [k, v] of toMetaEntries(seedMeta)) meta.set(k, v);
        });
      }
      return;
    }

    // ── collaborative mode ──

    function setLocalAwareness() {
      const u = userRef.current;
      const lu = localUserRef.current;
      if (!u || !provider) return;
      provider.awareness.setLocalStateField("user", {
        id: u.id,
        name: lu.name,
        color: lu.color,
        imageUrl: u.imageUrl ?? null,
      });
    }

    function readAwarenessUsers(): CollaborationUser[] {
      if (!provider) return [];
      return dedupeUsers(
        Array.from(provider.awareness.getStates().entries())
          .map(([clientId, state]) => {
            if (!state || typeof state !== "object" || !("user" in state))
              return null;
            const u = (state as { user?: Record<string, unknown> }).user;
            if (!u || typeof u.id !== "string") return null;
            if ((u.id as string).startsWith("guest")) return null;
            return {
              clientId,
              id: u.id as string,
              name: typeof u.name === "string" ? u.name : "User",
              color: typeof u.color === "string" ? u.color : "#3b82f6",
              imageUrl: typeof u.imageUrl === "string" ? u.imageUrl : null,
            } satisfies CollaborationUser;
          })
          .filter((v): v is CollaborationUser => v !== null),
      );
    }

    // Set awareness before attaching any listeners
    setLocalAwareness();

    const handleStatus = ({
      status: s,
    }: {
      status: CollaborationContextValue["status"];
    }) => {
      if (!isMountedRef.current) return;
      if (s === "connected") {
        setHasConnectedOnce(true);
        setLocalAwareness();
      }
      setStatus(s);
    };

    const handleSync = (isSynced: boolean) => {
      if (!isMountedRef.current) return;
      setSynced(isSynced);

      if (isSynced) {
        setHasSyncedOnce(true);
        setLocalAwareness();

        const isEmpty = fragment.toArray().length === 0;
        setShouldBootstrapContent(
          isEmpty && (initialContentRef.current?.length ?? 0) > 0,
        );

        const seedMeta = initialMetaRef.current;
        if (meta.size === 0 && seedMeta && Object.keys(seedMeta).length > 0) {
          doc.transact(() => {
            for (const [k, v] of toMetaEntries(seedMeta)) meta.set(k, v);
          });
        }
      } else {
        setShouldBootstrapContent(false);
      }
    };

    const handleAwareness = () => {
      if (!isMountedRef.current) return;
      queueMicrotask(() => {
        if (!isMountedRef.current) return;
        const users = readAwarenessUsers();
        setActiveUsers((cur) => (areUsersEqual(cur, users) ? cur : users));
      });
    };

    // Heartbeat to keep awareness alive (y-websocket clears idle entries)
    const heartbeat = window.setInterval(() => {
      if (provider.wsconnected) setLocalAwareness();
    }, 8_000);

    provider.on("status", handleStatus);
    provider.on("sync", handleSync);
    provider.awareness.on("change", handleAwareness);

    // Bootstrap current state
    handleStatus({
      status: provider.wsconnected
        ? "connected"
        : provider.wsconnecting
          ? "connecting"
          : "disconnected",
    });
    handleSync(provider.synced);
    queueMicrotask(handleAwareness);

    if (
      !provider.wsconnected &&
      !provider.wsconnecting &&
      provider.shouldConnect
    ) {
      provider.connect();
    }

    return () => {
      window.clearInterval(heartbeat);
      provider.off("status", handleStatus);
      provider.off("sync", handleSync);
      provider.awareness.off("change", handleAwareness);
    };
  }, [session]); // only session — user/localUser accessed via refs

  // ── Context value ─────────────────────────────────────────────────────────
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
      editorReady:
        serverResolved &&
        (mode === "local" || hasConnectedOnce || hasSyncedOnce),
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
    const update = () => {
      const next = readMetaMap(meta, initialMetaRef.current);
      setState((cur) => {
        const changed = Object.entries(next).some(
          ([k, v]) => cur[k as keyof T] !== v,
        );
        return changed ? next : cur;
      });
    };
    update();
    meta.observe(update);
    return () => meta.unobserve(update);
  }, [meta]);

  const updateMeta = useCallback(
    (patch: Partial<T>) => {
      doc.transact(() => {
        for (const [k, v] of toMetaEntries(patch)) meta.set(k, v);
      });
    },
    [doc, meta],
  );

  return { meta: state, updateMeta, synced };
}
