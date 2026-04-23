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
  const [loading, setLoading] = useState(true);

  // fetch initial notifications
  useEffect(() => {
    const controller = new AbortController();

    async function fetchInitial() {
      setLoading(true);

      try {
        const res = await fetch("/api/notifications", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to load notifications");

        const data = await res.json();

        setNotifications(data.data || []);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to fetch notifications:", error);
          setNotifications([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchInitial();

    return () => controller.abort();
  }, []);

  // listen to realtime notifications (FIXED MERGE LOGIC)
  useEffect(() => {
    function handler(e: Event) {
      const incoming = (e as CustomEvent<NotificationItem>).detail;

      setNotifications((prev) => {
        const existing = prev.find((n) => n.id === incoming.id);

        if (existing) {
          // merge instead of replace (CRITICAL FIX)
          return prev.map((n) =>
            n.id === incoming.id
              ? {
                  ...incoming,
                  isRead: existing.isRead || incoming.isRead,
                }
              : n,
          );
        }

        return [incoming, ...prev];
      });
    }

    window.addEventListener("notification:new", handler);

    return () => {
      window.removeEventListener("notification:new", handler);
    };
  }, [workspaceId]);

  // mark one as read
  async function markAsRead(notificationId: string) {
    const target = notifications.find((n) => n.id === notificationId);

    if (!target || target.isRead) return;

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );

    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed");
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: false } : n,
        ),
      );
    }
  }

  // mark all as read
  async function markAllAsRead() {
    const prevNotifications = notifications;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      const res = await fetch("/api/notifications/mark-all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed");
    } catch {
      setNotifications(prevNotifications);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
