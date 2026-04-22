"use client";

import { useEffect, useState } from "react";

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchInitial() {
      const res = await fetch("/api/notifications");
      const data = await res.json();

      setNotifications(data.data || []);
      setUnreadCount(data.meta?.unreadCount || 0);
    }

    fetchInitial();
  }, []);

  useEffect(() => {
    function handler(e: any) {
      const n = e.detail;

      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }

    window.addEventListener("notification:new", handler);

    return () => {
      window.removeEventListener("notification:new", handler);
    };
  }, []);

  return { notifications, unreadCount };
}
