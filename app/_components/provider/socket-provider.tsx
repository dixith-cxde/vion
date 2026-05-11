"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectSocket, disconnectSocket } from "@/lib/socket/client";

type NotificationPayload = {
  id: string;
};

type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  workspaceId: string | null;
  senderId: string | null;
  relationshipId: string | null;
  createdAt: string | Date;
};

export function SocketProvider() {
  const queryClient = useQueryClient();

  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    console.log("SOCKET PROVIDER MOUNTED");

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

        socket.on("connect", () => {
          console.log("Socket connected:", socket.id);
        });

        socket.on("notification:new", (notification: Notification) => {
          console.log("REALTIME NOTIFICATION:", notification);

          queryClient.setQueryData(["notifications"], (old: Notification[] | undefined) => {
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
                if (
                  notification.workspaceId &&
                  notification.entityType === "DOCUMENT" &&
                  notification.entityId
                ) {
                  window.location.href = `/workspaces/${notification.workspaceId}/documents/${notification.entityId}`;
                  return;
                }
                if (
                  notification.workspaceId &&
                  notification.entityType === "TASK" &&
                  notification.entityId
                ) {
                  window.location.href = `/workspaces/${notification.workspaceId}/tasks`;

                  return;
                }

                if (notification.workspaceId) {
                  window.location.href = `/workspaces/${notification.workspaceId}/notifications`;

                  return;
                }

                window.location.href = "/notifications";
              },
            },
          });
        });

        socket.on("notification:remove", (payload: NotificationPayload) => {
          queryClient.setQueryData(["notifications"], (old: Notification[] | undefined) => {
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
