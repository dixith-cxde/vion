"use client";

import { useNotifications } from "@/lib/hooks/use-notification";

export function NotificationPanel() {
  const { notifications, unreadCount } = useNotifications();

  return (
    <div className="w-[350px] border rounded-xl p-4">
      <div className="flex justify-between mb-3">
        <h2 className="font-semibold">Notifications</h2>
        <span className="text-sm text-muted-foreground">
          Unread: {unreadCount}
        </span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-3 rounded-lg border ${!n.isRead ? "bg-muted" : ""}`}
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.message}</p>
          </div>
        ))}

        {notifications.length === 0 && (
          <p className="text-sm text-muted-foreground">No notifications</p>
        )}
      </div>
    </div>
  );
}
