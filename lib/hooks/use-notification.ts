"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationWithSender } from "@/types/notification.type";

export type NotificationItem = NotificationWithSender;

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
  const queryKey = ["notifications", workspaceId ?? "all"];

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: fetchNotifications,
    refetchOnWindowFocus: false,
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

    onSuccess: (result, notificationId) => {
      queryClient.setQueryData<NotificationItem[]>(queryKey, (current) =>
        (current ?? []).map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: result.data.isRead,
              }
            : notification,
        ),
      );
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
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

    onSuccess: (_result, notificationId) => {
      queryClient.setQueryData<NotificationItem[]>(queryKey, (current) =>
        (current ?? []).filter((notification) => notification.id !== notificationId),
      );
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
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
      queryClient.setQueryData<NotificationItem[]>(queryKey, (current) =>
        (current ?? []).map((notification) =>
          !workspaceId || notification.workspaceId === workspaceId
            ? {
                ...notification,
                isRead: true,
              }
            : notification,
        ),
      );
    },

    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notifications,
    unreadCount,
    loading: isLoading,
    isError,
    error,
    refetch,

    toggleRead: toggleReadMutation.mutateAsync,
    deleteNotification: deleteMutation.mutateAsync,
    markAllAsRead: markAllMutation.mutateAsync,

    isToggling: toggleReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
