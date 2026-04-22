"use client";

import { useEffect, useState } from "react";

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
};

type UseNotificationsOptions = {
  workspaceId?: string;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { workspaceId } = options;

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchInitial() {
      setLoading(true);

      try {
        const query = workspaceId
          ? `?workspaceId=${encodeURIComponent(workspaceId)}`
          : "";
        const res = await fetch(`/api/notifications${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to load notifications");
        }

        const data = await res.json();

        setNotifications(data.data || []);
        setUnreadCount(data.meta?.unreadCount || 0);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to fetch notifications:", error);
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchInitial();

    return () => {
      controller.abort();
    };
  }, [workspaceId]);

  useEffect(() => {
    function handler(e: Event) {
      const notification = (e as CustomEvent<NotificationItem>).detail;

      if (
        workspaceId &&
        notification.workspaceId &&
        notification.workspaceId !== workspaceId
      ) {
        return;
      }

      setNotifications((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.id === notification.id,
        );
        const next =
          existingIndex === -1
            ? [notification, ...prev]
            : prev.map((item) =>
                item.id === notification.id ? notification : item,
              );

        setUnreadCount(
          next.filter((item) => !item.isRead).length,
        );

        return next;
      });
    }

    window.addEventListener("notification:new", handler);

    return () => {
      window.removeEventListener("notification:new", handler);
    };
  }, [workspaceId]);

  async function markAsRead(notificationId: string) {
    const target = notifications.find(
      (notification) => notification.id === notificationId,
    );

    if (!target || target.isRead) {
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    const res = await fetch(`/api/notifications/${notificationId}`, {
      method: "PATCH",
    });

    if (!res.ok) {
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: false }
            : notification,
        ),
      );
      setUnreadCount((prev) => prev + 1);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) {
      return;
    }

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, isRead: true })),
    );
    setUnreadCount(0);

    const res = await fetch("/api/notifications/mark-all", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: workspaceId ? JSON.stringify({ workspaceId }) : undefined,
    });

    if (!res.ok) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
