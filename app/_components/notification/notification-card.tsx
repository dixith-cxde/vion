"use client";

import {
  ArchiveRestoreIcon,
  CheckCircleIcon,
  ChevronRight,
  FileText,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type NotificationItem } from "@/lib/hooks/use-notification";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  parseMention,
  formatLabel,
  formatNotificationDateTime,
} from "./notification-utils";
import {
  NOTIFICATION_TYPE_COLOR,
  NOTIFICATION_TYPE_LABEL,
  type NotificationType,
} from "@/lib/constants";

function Avatar({
  name,
  imageUrl,
  size = 32,
}: {
  name: string | null | undefined;
  imageUrl: string | null | undefined;
  size?: number;
}) {
  const initials = name
    ? name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div
      className="relative shrink-0 rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name ?? ""}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <div
          className="w-full h-full rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium"
          style={{ fontSize: Math.round(size * 0.34) }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small stacked avatar group — for future recipients array if added to API
// ---------------------------------------------------------------------------

function AvatarStack({
  users,
  max = 3,
}: {
  users: Array<{ id: string; name: string | null; imageUrl: string | null }>;
  max?: number;
}) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  return (
    <div className="flex items-center">
      {visible.map((u, i) => (
        <div
          key={u.id}
          className="relative"
          style={{
            marginRight: i < visible.length - 1 ? -6 : 0,
            zIndex: max - i,
          }}
        >
          <div
            className="rounded-full overflow-hidden"
            style={{
              width: 20,
              height: 20,
              border: "1.5px solid hsl(var(--background))",
            }}
          >
            {u.imageUrl ? (
              <img
                src={u.imageUrl}
                alt={u.name ?? ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                {u.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="rounded-full bg-muted border border-background flex items-center justify-center text-[9px] font-medium text-muted-foreground"
          style={{ width: 20, height: 20, marginLeft: 2 }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sentence that describes the notification action
// ---------------------------------------------------------------------------

function actionSentence(type: string): string {
  switch (type) {
    case "MENTIONED":
      return "mentioned you in";
    case "TASK_ASSIGNED":
      return "assigned a task to you";
    case "INVITE_RECEIVED":
      return "invited you to a workspace";
    case "COMMIT_LINKED":
      return "linked a commit";
    case "DOCUMENT_UPDATED":
      return "updated a document";
    default:
      return formatLabel(type).toLowerCase();
  }
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

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
  const parts = parseMention(notification.message);

  const typeKey = notification.type as NotificationType;
  const typeColor = NOTIFICATION_TYPE_COLOR[typeKey] ?? {
    bg: "bg-slate-100",
    text: "text-slate-600",
  };
  const typeLabel =
    NOTIFICATION_TYPE_LABEL[typeKey] ?? formatLabel(notification.type);

  // Short relative time for the top-right of the card
  function shortTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  async function toggleRead(e: React.MouseEvent) {
    e.stopPropagation();
    if (loadingAction) return;
    setLoadingAction("toggle");
    const next = !notification.isRead;
    window.dispatchEvent(
      new CustomEvent("notification:update", {
        detail: { id: notification.id, isRead: next },
      }),
    );
    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const actual = data?.data?.isRead;
      if (actual !== next) {
        window.dispatchEvent(
          new CustomEvent("notification:update", {
            detail: { id: notification.id, isRead: actual },
          }),
        );
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent("notification:update", {
          detail: { id: notification.id, isRead: !next },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId: notification.entityId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Failed to join.");
      toast({
        title: "Workspace Joined",
        description: "You have joined successfully.",
      });
      if (data.data?.workspaceId)
        window.location.assign(`/workspaces/${data.data.workspaceId}`);
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

  function navigateToEntity() {
    if (notification.entityId && notification.workspaceId) {
      const base = `/workspaces/${notification.workspaceId}`;
      if (notification.entityType === "DOCUMENT") {
        router.push(`${base}/documents/${notification.entityId}`);
      } else if (notification.entityType === "TASK") {
        router.push(`${base}/tasks/${notification.entityId}`);
      } else {
        router.push(base);
      }
    }
  }

  return (
    <div
      className={cn(
        "group relative rounded-[14px] transition-colors duration-100 cursor-pointer overflow-hidden",
        isUnread
          ? "bg-background border border-border/60 hover:border-border/90 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
          : "bg-muted/25 border border-transparent hover:bg-muted/40",
      )}
      onClick={navigateToEntity}
    >
      {/* Unread bar */}
      {isUnread && (
        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-foreground rounded-r-[1px]" />
      )}

      <div className={cn("px-4 py-[15px]", isUnread && "pl-5")}>
        {/* ── ROW 1: Sender avatar + name + action + time + type badge ── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: avatar + sender info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar
              name={notification.sender?.name}
              imageUrl={notification.sender?.imageUrl}
              size={34}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap leading-none">
                <span
                  className={cn(
                    "text-[13px] font-medium",
                    isUnread ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {notification.sender?.name ?? "System"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {actionSentence(notification.type)}
                </span>
              </div>
            </div>
          </div>

          {/* Right: type badge + relative time */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span
              className={cn(
                "rounded-full px-2 py-[3px] text-[10px] font-medium leading-none whitespace-nowrap",
                isUnread
                  ? `${typeColor.bg} ${typeColor.text}`
                  : "bg-background border border-border/40 text-muted-foreground",
              )}
            >
              {typeLabel}
            </span>
            <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">
              {shortTime(notification.createdAt)}
            </span>
          </div>
        </div>

        {/* ── ROW 2: Notification title ── */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <p
            className={cn(
              "text-[14px] font-medium leading-snug flex-1",
              isUnread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {notification.title}
          </p>

          {/* Hover actions + chevron — always reserving space */}
          <div className="flex items-center gap-0.5 shrink-0">
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
              <button
                onClick={toggleRead}
                disabled={loadingAction === "toggle"}
                title={isUnread ? "Mark as read" : "Mark as unread"}
                className="flex size-[26px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {loadingAction === "toggle" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : isUnread ? (
                  <CheckCircleIcon className="size-3.5" />
                ) : (
                  <ArchiveRestoreIcon className="size-3.5" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteNotification(e);
                }}
                disabled={loadingAction === "delete"}
                title="Delete"
                className="flex size-[26px] items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                {loadingAction === "delete" ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </button>
            </div>
            <ChevronRight className="size-[15px] text-muted-foreground/40 ml-0.5" />
          </div>
        </div>

        {/* ── ROW 3: Message body with inline mention chips ── */}
        <div className="mb-3">
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            {parts.map((part, i) => {
              if (part.type === "text")
                return <span key={i}>{part.value}</span>;
              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToEntity();
                  }}
                  className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                >
                  <FileText className="size-3 shrink-0" />
                  {part.value}
                </button>
              );
            })}
          </p>
        </div>

        {/* ── ROW 4: Linked entity pill — entityType + entityId from API ── */}
        {notification.entityType && notification.entityId && (
          <div className="mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateToEntity();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[12px] text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              <FileText className="size-3.5 text-sky-600 shrink-0" />
              <span className="font-medium text-foreground/80">
                {formatLabel(notification.entityType)}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-mono text-[10.5px] text-muted-foreground/60 truncate max-w-[120px]">
                {notification.entityId.slice(0, 8)}...
              </span>
            </button>
          </div>
        )}

        {/* ── ROW 5: Invite CTA ── */}
        {notification.type === "INVITE_RECEIVED" && (
          <div className="mb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handleInvite(e);
              }}
              disabled={joiningInvite}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-50"
            >
              {joiningInvite ? (
                <>
                  <LoaderCircle className="size-3 animate-spin" /> Joining...
                </>
              ) : (
                "Accept invite"
              )}
            </button>
          </div>
        )}

        {/* ── ROW 6: Footer — full timestamp ── */}
        <div className="flex items-center gap-2 pt-2.5 border-t border-border/40">
          <span className="text-[11px] text-muted-foreground/50">
            {formatNotificationDateTime(notification.createdAt)}
          </span>
          {notification.workspaceId && (
            <>
              <span className="size-[3px] rounded-full bg-border/60 shrink-0" />
              <span className="font-mono text-[10.5px] text-muted-foreground/40">
                ws/{notification.workspaceId.slice(0, 8)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
