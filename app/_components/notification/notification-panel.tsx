"use client";

import {
  ArchiveRestoreIcon,
  BellRing,
  CheckCheck,
  CheckCircleIcon,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type NotificationItem,
  useNotifications,
} from "@/lib/hooks/use-notification";
import { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ToolTipComponent from "../ui/tool-tip";
type NotificationPanelProps = {
  workspaceId?: string;
};

function parseMentionText(message: string) {
  const regex = /@#\{(.+?)\}/;
  const match = message.match(regex);

  if (!match) {
    return { before: message, mention: null, after: "" };
  }

  return {
    before: message.slice(0, match.index),
    mention: match[1], // document name
    after: message.slice((match.index ?? 0) + match[0].length),
  };
}

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
  const [loadingAction, setLoadingAction] = useState<
    "toggle" | "delete" | null
  >(null);

  const router = useRouter();
  const { before, mention, after } = parseMentionText(notification.message);

  async function toggleRead(e: React.MouseEvent) {
    e.stopPropagation();

    if (loadingAction) return;
    setLoadingAction("toggle");

    const optimisticState = !notification.isRead;

    // optimistic UI
    window.dispatchEvent(
      new CustomEvent("notification:update", {
        detail: {
          id: notification.id,
          isRead: optimisticState,
        },
      }),
    );

    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      const actualState = data?.data?.isRead;

      if (actualState !== optimisticState) {
        window.dispatchEvent(
          new CustomEvent("notification:update", {
            detail: {
              id: notification.id,
              isRead: actualState,
            },
          }),
        );
      }
    } catch {
      // rollback
      window.dispatchEvent(
        new CustomEvent("notification:update", {
          detail: {
            id: notification.id,
            isRead: !optimisticState,
          },
        }),
      );
    } finally {
      setLoadingAction(null);
    }
  }

  async function deleteNotification(e: React.MouseEvent) {
    e.stopPropagation();

    if (loadingAction) return;
    setLoadingAction("delete");

    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      window.dispatchEvent(
        new CustomEvent("notification:remove", {
          detail: { id: notification.id },
        }),
      );
    } finally {
      setLoadingAction(null);
    }
  }

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

      toast({
        title: "Workspace Joined",
        description: "You have joined successfully.",
      });

      if (data.data?.workspaceId) {
        window.location.assign(`/workspaces/${data.data.workspaceId}`);
      }
    } catch (err) {
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
      className={cn(
        "group flex w-full items-start gap-3 rounded-xl border px-3 py-3 transition",
        isUnread
          ? "border-border/80 bg-accent/30 hover:bg-accent/50"
          : "border-border/60 bg-background opacity-80",
      )}
    >
      {/* ICON */}
      <div className="mt-0.5 flex size-9 items-center justify-center rounded-lg border bg-background">
        <BellRing className="size-3.5" />
      </div>

      {/* CONTENT */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{notification.title}</p>

            <p className="mt-1 text-sm text-muted-foreground">
              {before}

              {mention && (
                <span
                  className="ml-1 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 cursor-pointer hover:bg-blue-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      notification.entityType === "DOCUMENT" &&
                      notification.entityId
                    ) {
                      router.push(
                        `/workspaces/${notification.workspaceId}/documents/${notification.entityId}`,
                      );
                    }
                  }}
                >
                  @{mention}
                </span>
              )}

              {after}
            </p>

            {/* INVITE ACTION */}
            {notification.type === "INVITE_RECEIVED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleInvite}
                disabled={joiningInvite}
                className="mt-2 h-7 text-xs"
              >
                {joiningInvite ? "Joining..." : "Accept"}
              </Button>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            {/* TOGGLE */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleRead}
              disabled={loadingAction === "toggle"}
              className="size-7"
            >
              {loadingAction === "toggle" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : isUnread ? (
                <CheckCircleIcon className="size-4" />
              ) : (
                <ArchiveRestoreIcon className="size-4" />
              )}
            </Button>

            {/* DELETE */}
            <Button
              size="icon"
              variant="ghost"
              onClick={deleteNotification}
              disabled={loadingAction === "delete"}
              className="size-7 text-red-500"
            >
              {loadingAction === "delete" ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              notification.type === "MENTIONED" && "bg-blue-100 text-blue-700",
              notification.type === "TASK_ASSIGNED" &&
                "bg-purple-100 text-purple-700",
              notification.type === "INVITE_RECEIVED" &&
                "bg-green-100 text-green-700",
            )}
          >
            {formatLabel(notification.type)}
          </span>

          <span className="text-muted-foreground">
            {formatNotificationDateTime(notification.createdAt)}
          </span>
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
