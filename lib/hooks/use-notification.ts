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
  sender?: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  } | null;
};

type UseNotificationsOptions = {
  workspaceId?: string;
};

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { workspaceId } = options;

  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // fetch initial notifications
  useEffect(() => {
    async function fetchInitial() {
      setLoading(true);

      try {
        const res = await fetch("/api/notifications", {
          cache: "no-store",
          credentials: "include",
        });

        if (!res.ok) throw new Error("Failed to load notifications");

        const data = await res.json();
        console.log(data);

        setAllNotifications(data.data || []);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        setAllNotifications([]);
      } finally {
        setLoading(false);
      }
    }

    fetchInitial();
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const { id, isRead } = (
        e as CustomEvent<{
          id: string;
          isRead: boolean;
        }>
      ).detail;
      console.log("UPDATE NOTIFICATION: ", { isRead, id });
      setAllNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, isRead } : n));

        return [...updated];
      });
    }

    window.addEventListener("notification:update", handler);

    return () => {
      window.removeEventListener("notification:update", handler);
    };
  }, []);

  // HANDLE READ/UNREAD TOGGLE (THIS IS MISSING → CAUSES YOUR BUG)
  useEffect(() => {
    function handler(e: Event) {
      const { id, isRead } = (
        e as CustomEvent<{
          id: string;
          isRead: boolean;
        }>
      ).detail;

      setAllNotifications((prev) => {
        const updated = prev.map((n) => (n.id === id ? { ...n, isRead } : n));

        return [...updated]; // force re-render
      });
    }

    window.addEventListener("notification:update", handler);

    return () => {
      window.removeEventListener("notification:update", handler);
    };
  }, []);

  useEffect(() => {
    function handler(e: Event) {
      const { id } = (e as CustomEvent<{ id: string }>).detail;

      setAllNotifications((prev) => prev.filter((n) => n.id !== id));
    }

    window.addEventListener("notification:remove", handler);

    return () => {
      window.removeEventListener("notification:remove", handler);
    };
  }, []);

  // listen to realtime notifications (FIXED MERGE LOGIC)
  useEffect(() => {
    function handler(e: Event) {
      const incoming = (e as CustomEvent<NotificationItem>).detail;

      setAllNotifications((prev) => {
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
  }, []);

  // const notifications = workspaceId
  //   ? allNotifications.filter(
  //       (notification) => notification.workspaceId === workspaceId,
  //     )
  //   : allNotifications;
  const notifications = allNotifications;

  // mark one as read
  async function markAsRead(notificationId: string) {
    const target = allNotifications.find((n) => n.id === notificationId);

    if (!target || target.isRead) return;

    setAllNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
    );

    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error("Failed");
    } catch {
      setAllNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: false } : n,
        ),
      );
    }
  }

  // mark all as read
  async function markAllAsRead() {
    const prevNotifications = allNotifications;

    setAllNotifications((prev) =>
      prev.map((n) =>
        workspaceId && n.workspaceId !== workspaceId
          ? n
          : { ...n, isRead: true },
      ),
    );

    try {
      const res = await fetch("/api/notifications/mark-all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workspaceId ? { workspaceId } : {}),
      });

      if (!res.ok) throw new Error("Failed");
    } catch {
      setAllNotifications(prevNotifications);
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
