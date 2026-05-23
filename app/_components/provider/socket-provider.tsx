"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket, disconnectSocket } from "@/lib/socket/client";
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

  const { getToken, isSignedIn } = useAuth();

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

        const socket = await connectSocket(token);
        socket.removeAllListeners("notification:new");
        socket.removeAllListeners("notification:remove");

        socket.on("notification:new", (notification: NotificationWithSender) => {
          queryClient.setQueryData(["notifications"], (old: NotificationWithSender[] | undefined) => {
            const current = old ?? [];

            const exists = current.some((item) => item.id === notification.id);

            if (exists) {
              return current;
            }

            return [notification, ...current];
          });

          toast(notification.title, {
            description: notification.message,
            action: {
              label: "Open",
              onClick: () => {
                window.location.href = getNotificationHref(notification);
              },
            },
          });
        });

        socket.on("notification:remove", (payload: NotificationPayload) => {
          queryClient.setQueryData(["notifications"], (old: NotificationWithSender[] | undefined) => {
            const current = old ?? [];

            return current.filter((notification) => notification.id !== payload.id);
          });
        });
      } catch (error) {
        console.error("Realtime initialization failed:", error);
      }
    }

    initializeRealtime();

    return () => {
      mounted = false;

      disconnectSocket();
    };
  }, [getToken, isSignedIn, queryClient]);

  return null;
}
