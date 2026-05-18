"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

  const queryClient = useQueryClient();

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

  const toggleReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Failed to update notification");
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete notification");
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/notifications/mark-all", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workspaceId ? { workspaceId } : {}),
      });

      if (!response.ok) {
        throw new Error("Failed to mark all as read");
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
  });

  return {
    notifications,
    unreadCount,
    loading: isLoading,

    toggleRead: toggleReadMutation.mutateAsync,
    deleteNotification: deleteMutation.mutateAsync,
    markAllAsRead: markAllMutation.mutateAsync,

    isToggling: toggleReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
