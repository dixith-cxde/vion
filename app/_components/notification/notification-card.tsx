"use client";

import {
    CheckCircleIcon,
    ChevronRight,
    FileText,
    Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { type NotificationItem } from "@/lib/hooks/use-notification";

import {
    NOTIFICATION_TYPE_COLOR,
    NOTIFICATION_TYPE_LABEL,
    type NotificationType,
} from "@/lib/constants";

import {
    actionSentence,
    formatLabel,
    formatNotificationDateTime,
    parseMention,
} from "./notification-utils";
import { Avatar } from "./notification-avatar";
import { shortTime, useNotificationActions } from "./use-notification-actions";
import { useState } from "react";

interface NotificationCardProps {
    notification: NotificationItem;

    onToggleRead: (id: string) => Promise<unknown>;

    onDelete: (id: string) => Promise<unknown>;
}

export function NotificationCard({ notification, onToggleRead, onDelete }: NotificationCardProps) {
    const [now] = useState(() => Date.now());
    const { handleInvite, navigateToEntity } = useNotificationActions(notification);

    const isUnread = !notification.isRead;
    const parts = parseMention(notification.message);

    const typeKey = notification.type as NotificationType;

    const typeColor = NOTIFICATION_TYPE_COLOR[typeKey] ?? {
        bg: "bg-slate-100",
        text: "text-slate-600",
        border: "",
    };

    const typeLabel = NOTIFICATION_TYPE_LABEL[typeKey] ?? formatLabel(notification.type);

    return (
        <div
            className={cn(
                "group relative cursor-pointer overflow-hidden rounded-sm transition-colors duration-100",

                isUnread
                    ? "border border-border/60 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
                    : "border border-transparent bg-muted/25 hover:bg-muted/40"
            )}
            onClick={navigateToEntity}
        >
            {isUnread && (
                <span className="absolute bottom-0 left-0 top-0 w-[3px] rounded-r-[1px] bg-foreground" />
            )}

            <div className={cn("px-4 py-[15px]", isUnread && "pl-5")}>
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar
                            name={notification.sender?.name}
                            imageUrl={notification.sender?.imageUrl ?? "/system.svg"}
                            size={34}
                        />

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 leading-none">
                                <span
                                    className={cn(
                                        "text-[13px] font-medium",
                                        isUnread ? "text-foreground" : "text-muted-foreground",
                                        !notification.sender && "uppercase"
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

                    <div className="flex shrink-0 items-center gap-2">
                        <div
                            className={cn(
                                "inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-medium leading-none",

                                isUnread
                                    ? `${typeColor.bg} ${typeColor.text}`
                                    : "border border-border/40 bg-background text-muted-foreground"
                            )}
                        >
                            <div
                                className={cn(
                                    "size-2 shrink-0 rounded-full",

                                    isUnread ? "bg-current opacity-70" : "bg-muted-foreground/50"
                                )}
                            />

                            <span>{typeLabel}</span>
                        </div>

                        <span className="whitespace-nowrap text-[11px] text-muted-foreground/60">
                            {shortTime(now, notification.createdAt.toString())}
                        </span>
                    </div>
                </div>

                <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="mb-3">
                        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                            {parts.map((part, i) => {
                                if (part.type === "text") {
                                    return <span key={i}>{part.value}</span>;
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={(e) => {
                                            e.stopPropagation();

                                            navigateToEntity();
                                        }}
                                        className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 transition-colors hover:bg-sky-100"
                                    >
                                        <FileText className="size-3 shrink-0" />

                                        {part.value}
                                    </button>
                                );
                            })}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                        <div className="flex items-center gap-0.5 opacity-40 transition-opacity duration-150 group-hover:opacity-100">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();

                                    void onToggleRead(notification.id);
                                }}
                                title={isUnread ? "Mark as read" : "Mark as unread"}
                                className="flex size-[26px] items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
                            >
                                <CheckCircleIcon className="size-3.5" />
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();

                                    void onDelete(notification.id);
                                }}
                                title="Delete"
                                className="flex size-[26px] items-center justify-center rounded-lg text-foreground/70 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>

                        <ChevronRight className="ml-0.5 size-[15px] text-muted-foreground/70 transition-colors group-hover:text-foreground/70" />
                    </div>
                </div>

                {notification.entityType && notification.entityId && (
                    <div className="mb-3">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();

                                navigateToEntity();
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted/60"
                        >
                            <FileText className="size-3.5 shrink-0 text-sky-600" />

                            <span className="font-medium text-foreground/80">
                                {formatLabel(notification.entityType)}
                            </span>

                            <span className="text-muted-foreground/50">·</span>

                            <span className="max-w-[120px] truncate font-mono text-[10.5px] text-muted-foreground/60">
                                {notification.entityId.slice(0, 8)}
                                ...
                            </span>
                        </button>
                    </div>
                )}

                {notification.type === "INVITE_RECEIVED" && (
                    <div className="mb-3">
                        <button
                            onClick={(e) => {
                                void handleInvite(e);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted/40"
                        >
                            Accept invite
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2 border-t border-border/40 pt-2.5">
                    <span className="text-[11px] text-muted-foreground/50">
                        {formatNotificationDateTime(notification.createdAt.toString())}
                    </span>

                    {notification.workspaceId && (
                        <>
                            <span className="size-[3px] shrink-0 rounded-full bg-border/60" />

                            <span className="font-mono text-[10.5px] text-muted-foreground/40">
                                ws/
                                {notification.workspaceId.slice(0, 8)}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
