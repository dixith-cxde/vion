"use client";

import {
  BellRing,
  CheckCheck,
  ChevronRight,
  Inbox,
  LoaderCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type NotificationItem,
  useNotifications,
} from "@/lib/hooks/use-notification";
import { useEffect, useRef, useState } from "react";

import { toast } from "@/hooks/use-toast";
type NotificationPanelProps = {
  workspaceId?: string;
};

export function NotificationPanel({ workspaceId }: NotificationPanelProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications({ workspaceId });

  const unreadNotifications = notifications.filter(
    (notification) => !notification.isRead,
  );
  const readNotifications = notifications.filter(
    (notification) => notification.isRead,
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
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
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
            onClick={() => onSelect(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}

function NotificationCard({
  notification,
  onClick,
}: {
  notification: NotificationItem;
  onClick: () => void;
}) {
  const isUnread = !notification.isRead;
  const [joiningInvite, setJoiningInvite] = useState(false);

  async function handleInvite(e: React.MouseEvent) {
    e.stopPropagation();

    if (!notification.entityId || joiningInvite) return;

    try {
      setJoiningInvite(true);

      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationId: notification.entityId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to join workspace.");
      }

      if (isUnread) {
        onClick();
      }

      toast({
        title: "Workspace Joined",
        description: "You have joined successfully.",
      });

      if (data.data?.workspaceId) {
        window.location.assign(`/workspaces/${data.data.workspaceId}`);
      }
    } catch (err) {
      console.error(err);

      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to join workspace.",
        variant: "destructive",
      });
    } finally {
      setJoiningInvite(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (isUnread) onClick();
      }}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && isUnread) {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3.5 text-left transition-colors",
        isUnread
          ? "cursor-pointer border-border/80 bg-accent/35 shadow-sm hover:bg-accent/50"
          : "cursor-pointer border-border/60 bg-background opacity-80",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border",
          isUnread
            ? "border-border/80 bg-background text-foreground"
            : "border-border/60 bg-muted/25 text-muted-foreground",
        )}
      >
        <BellRing className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {notification.title}
            </div>

            <div
              className={cn(
                "mt-1 text-sm leading-6",
                isUnread ? "text-foreground/80" : "text-muted-foreground",
              )}
            >
              {notification.message}
            </div>

            {notification.type === "INVITE_RECEIVED" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleInvite}
                disabled={joiningInvite}
                className="mt-2 h-8 rounded-md px-3 text-xs"
              >
                {joiningInvite ? "Joining..." : "Accept Invite"}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 self-start">
            <Badge
              variant={isUnread ? "muted" : "outline"}
              className="rounded-md px-2 py-0 text-[10px]"
            >
              {isUnread ? "Unread" : "Read"}
            </Badge>

            {isUnread && (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="rounded-md uppercase">
            {formatLabel(notification.type)}
          </Badge>
          <span>{formatNotificationDateTime(notification.createdAt)}</span>
        </div>
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

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatNotificationDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
