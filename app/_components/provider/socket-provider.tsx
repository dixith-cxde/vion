"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket, disconnectSocket, hasSocket, reauthSocket } from "@/lib/socket/client";
import { NotificationWithSender } from "@/types/notification.type";

type NotificationPayload = {
  id: string;
};

function getNotificationHref(notification: NotificationWithSender) {
  if (notification.workspaceId && notification.entityType === "DOCUMENT" && notification.entityId) {
    return `/workspaces/${notification.workspaceId}/documents/${notification.entityId}`;
  }

  if (notification.workspaceId && notification.entityType === "TASK" && notification.entityId) {
    return `/workspaces/${notification.workspaceId}/tasks/${notification.entityId}`;
  }

  if (notification.workspaceId && notification.entityType === "CHANNEL" && notification.entityId) {
    return `/workspaces/${notification.workspaceId}/chat?channelId=${notification.entityId}`;
  }

  if (notification.workspaceId && notification.entityType === "MESSAGE" && notification.entityId) {
    return `/workspaces/${notification.workspaceId}/chat?messageId=${notification.entityId}`;
  }

  if (notification.workspaceId && notification.entityType && notification.entityId) {
    if (notification.entityType.startsWith("GITHUB_")) {
      return `/workspaces/${notification.workspaceId}/github?entityType=${notification.entityType}&entityId=${notification.entityId}`;
    }

    return `/workspaces/${notification.workspaceId}/graph?entityType=${notification.entityType}&entityId=${notification.entityId}`;
  }

  return notification.workspaceId
    ? `/workspaces/${notification.workspaceId}/notification`
    : "/workspaces";
}

export function SocketProvider() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { getToken, isSignedIn } = useAuth();
  const ownedConnection = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    let mounted = true;

    async function initializeRealtime() {
      try {
        const token = await getToken();

        if (!token || !mounted) {
          return;
        }

        const alreadyConnected = hasSocket();
        const socket = await connectSocket(token);
        ownedConnection.current = !alreadyConnected;

        socket.off("notification:new");
        socket.off("notification:remove");
        socket.off("connect_error");

        socket.on("connect_error", async (err) => {
          if (!mounted) {
            return;
          }

          if (err.message.toLowerCase().includes("auth")) {
            const freshToken = await getToken({ skipCache: true });

            if (freshToken && mounted) {
              reauthSocket(freshToken);
            }
          }
        });

        socket.on("notification:new", (notification: NotificationWithSender) => {
          void queryClient.setQueriesData<NotificationWithSender[]>(
            { queryKey: ["notifications"] },
            (old) => {
              const current = old ?? [];

              const exists = current.some((item) => item.id === notification.id);

              if (exists) {
                return current;
              }

              return [notification, ...current];
            },
          );

          toast(notification.title, {
            description: notification.message,
            action: {
              label: "Open",
              onClick: () => {
                router.push(getNotificationHref(notification));
              },
            },
          });
        });

        socket.on("notification:remove", (payload: NotificationPayload) => {
          void queryClient.setQueriesData<NotificationWithSender[]>(
            { queryKey: ["notifications"] },
            (old) => {
              const current = old ?? [];

              return current.filter((notification) => notification.id !== payload.id);
            },
          );
        });
      } catch (error) {
        console.error("Realtime initialization failed:", error);
      }
    }

    initializeRealtime();

    return () => {
      mounted = false;

      if (ownedConnection.current) {
        ownedConnection.current = false;
        disconnectSocket();
      }
    };
  }, [getToken, isSignedIn, queryClient, router]);

  return null;
}
