"use client";

import { useQuery } from "@tanstack/react-query";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  workspaceId: string | null;
  createdAt: string;
  sender?: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  } | null;
};

type UseNotificationsOptions = {
  workspaceId?: string;
};

async function fetchNotifications() {
  const response = await fetch("/api/notifications", {
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to load notifications");
  }

  const data = await response.json();

  return data.data as NotificationItem[];
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { workspaceId } = options;

  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
  });

  const notifications = workspaceId
    ? data.filter(
        (notification) =>
          notification.workspaceId === workspaceId || notification.type === "INVITE_RECEIVED"
      )
    : data;

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  async function markAsRead(notificationId: string) {
    await fetch(`/api/notifications/${notificationId}`, {
      method: "PATCH",
    });
  }

  async function markAllAsRead() {
    await fetch("/api/notifications/mark-all", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workspaceId ? { workspaceId } : {}),
    });
  }

  return {
    notifications,
    unreadCount,
    loading: isLoading,
    markAsRead,
    markAllAsRead,
  };
}
