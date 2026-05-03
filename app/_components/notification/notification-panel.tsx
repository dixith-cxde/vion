"use client";

import { BellRing, CheckCheck, Inbox, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type NotificationItem,
  useNotifications,
} from "@/lib/hooks/use-notification";
import { useEffect, useMemo, useRef } from "react";

import { toast } from "@/hooks/use-toast";
import { NotificationCard } from "./notification-card";

type NotificationPanelProps = {
  workspaceId?: string;
};

export function NotificationPanel({ workspaceId }: NotificationPanelProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications({ workspaceId });

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.isRead),
    [notifications],
  );

  const readNotifications = useMemo(
    () => notifications.filter((n) => n.isRead),
    [notifications],
  );

  // TOAST ON NEW NOTIFICATION
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      const latest = notifications[0];

      if (latest && !latest.isRead) {
        toast({
          title: latest.title,
          description: latest.message,
        });
      }
    }

    prevCountRef.current = notifications.length;
  }, [notifications]);

  return (
    <section className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3 md:px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/35 text-foreground">
            <BellRing className="size-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <span className="font-medium">Notifications</span>
              <span className="text-muted-foreground">
                {notifications.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Full notification feed, with unread items pinned first.
            </p>
            {unreadCount > 0 && (
              <Badge
                variant="muted"
                className="mt-1 rounded-md px-2 py-0 text-[10px] tracking-[0.14em]"
              >
                {unreadCount} unread
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="p-3 md:p-4">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/15 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {unreadNotifications.length > 0 && (
              <NotificationGroup
                title="Unread"
                count={unreadNotifications.length}
                notifications={unreadNotifications}
                onSelect={(id) => markAsRead(id)}
              />
            )}

            {readNotifications.length > 0 && (
              <NotificationGroup
                title="Read"
                count={readNotifications.length}
                notifications={readNotifications}
                onSelect={(id) => markAsRead(id)}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function NotificationGroup({
  title,
  count,
  notifications,
  onSelect,
}: {
  title: string;
  count: number;
  notifications: NotificationItem[];
  onSelect: (notificationId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>

      <div className="grid gap-2">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            // onClick={() => onSelect(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-md border border-border/70 bg-background">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        No notifications yet
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        New workspace activity and alerts will appear here.
      </p>
    </div>
  );
}
