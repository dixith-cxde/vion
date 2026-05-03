"use client";

import {
  ArchiveRestoreIcon,
  BellRing,
  CheckCircleIcon,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type NotificationItem } from "@/lib/hooks/use-notification";
import { useState } from "react";

import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  formatLabel,
  formatNotificationDateTime,
  parseMentionText,
} from "./notification-utils";

export function NotificationCard({
  notification,
}: {
  notification: NotificationItem;
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
