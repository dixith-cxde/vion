"use client";

import { Bell, CheckCheck, Inbox, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type NotificationItem,
  useNotifications,
} from "@/lib/hooks/use-notification";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { NotificationCard } from "./notification-card";

type Tab = "unread" | "all";

export function NotificationPanel({ workspaceId }: { workspaceId?: string }) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications({ workspaceId });
  const [activeTab, setActiveTab] = useState<Tab>("unread");

  const unread = useMemo(
    () => notifications.filter((n) => !n.isRead),
    [notifications],
  );
  const read = useMemo(
    () => notifications.filter((n) => n.isRead),
    [notifications],
  );
  const displayed = activeTab === "unread" ? unread : notifications;

  const prevCountRef = useRef(0);
  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      const latest = notifications[0];
      if (latest && !latest.isRead)
        toast({ title: latest.title, description: latest.message });
    }
    prevCountRef.current = notifications.length;
  }, [notifications]);

  return (
    <section className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 pb-10 py-[18px]">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/20">
            <Bell className="size-[17px] text-foreground" strokeWidth={1.7} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14.5px] font-medium text-foreground">
                Notifications
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                {notifications.length}
              </span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium text-background leading-none">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Unread items are pinned first.
            </p>
          </div>
        </div>

        <button
          onClick={() => void markAllAsRead()}
          disabled={unreadCount === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCheck className="size-3.5" />
          Mark all read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/60 px-5">
        {(["unread", "all"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative py-2.5 mr-5 text-[12.5px] font-medium capitalize transition-colors",
              activeTab === tab
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70",
            )}
          >
            {tab === "unread" ? "Unread" : "All"}
            {tab === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                {unreadCount}
              </span>
            )}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-foreground" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/50 bg-muted/10 text-[13px] text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" />
            Loading...
          </div>
        ) : displayed.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="space-y-3">
            {/* Unread group */}
            {activeTab === "all" && unread.length > 0 && (
              <NotificationGroup
                label="Unread"
                count={unread.length}
                notifications={unread}
                onSelect={markAsRead}
              />
            )}
            {/* For unread tab, render flat */}
            {activeTab === "unread" && (
              <div className="space-y-2">
                {unread.map((n) => (
                  <NotificationCard key={n.id} notification={n} />
                ))}
              </div>
            )}
            {/* Read group — only in "all" tab */}
            {activeTab === "all" && read.length > 0 && (
              <NotificationGroup
                label="Read"
                count={read.length}
                notifications={read}
                onSelect={markAsRead}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function NotificationGroup({
  label,
  count,
  notifications,
  onSelect,
}: {
  label: string;
  count: number;
  notifications: NotificationItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 py-1">
        <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
          {label}
        </span>
        <span className="text-[11px] text-muted-foreground/60">{count}</span>
      </div>
      <div className="space-y-2">
        {notifications.map((n) => (
          <NotificationCard key={n.id} notification={n} />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 bg-muted/10 px-6 py-10 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background">
        <Inbox className="size-4 text-muted-foreground" strokeWidth={1.6} />
      </div>
      <div>
        <p className="text-[13.5px] font-medium text-foreground">
          {tab === "unread" ? "All caught up" : "No notifications"}
        </p>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {tab === "unread"
            ? "No unread notifications right now."
            : "Workspace activity will appear here."}
        </p>
      </div>
    </div>
  );
}
