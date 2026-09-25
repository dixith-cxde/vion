"use client";

import { useEffect, useRef, useState } from "react";

import { areUsersEqual, dedupeUsers, toMetaEntries, type CollaborationUser } from "./collab-utils";
import type { SessionShape } from "./collab-session";

type LocalUser = {
  name: string;
  color: string;
};

type CollabUser =
  | {
      id: string;
      imageUrl?: string | null;
    }
  | null
  | undefined;

type UseCollabSyncArgs = {
  session: SessionShape;
  initialContentLength: number;
  initialMeta: Record<string, string | number | boolean | null | undefined> | undefined;
  localUser: LocalUser;
  user: CollabUser;
};

export function useCollabProviderSync({
  session,
  initialContentLength,
  initialMeta,
  localUser,
  user,
}: UseCollabSyncArgs) {
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [synced, setSynced] = useState(false);
  const [hasConnectedOnce, setHasConnectedOnce] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);
  const [shouldBootstrapContent, setShouldBootstrapContent] = useState(false);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);

  const initialContentLengthRef = useRef(initialContentLength);
  const initialMetaRef = useRef(initialMeta);
  const isMountedRef = useRef(true);
  const localUserRef = useRef(localUser);
  const userRef = useRef(user);

  useEffect(() => {
    initialContentLengthRef.current = initialContentLength;
  }, [initialContentLength]);

  useEffect(() => {
    initialMetaRef.current = initialMeta;
  }, [initialMeta]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    localUserRef.current = localUser;
  }, [localUser]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const { provider, doc, fragment, meta } = session;

    if (!provider) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- local Yjs session sync
      setStatus("disconnected");

      setSynced(true);

      setHasConnectedOnce(true);

      setHasSyncedOnce(true);

      setShouldBootstrapContent(initialContentLengthRef.current > 0);

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
      status: "connecting" | "connected" | "disconnected";
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

        setShouldBootstrapContent(isEmpty && initialContentLengthRef.current > 0);

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

  return { status, synced, hasConnectedOnce, hasSyncedOnce, shouldBootstrapContent, activeUsers };
}
