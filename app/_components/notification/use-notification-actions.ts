"use client";

import { useRouter } from "next/navigation";

import { toast } from "@/hooks/use-toast";

import { type NotificationItem } from "@/lib/hooks/use-notification";

export function useNotificationActions(notification: NotificationItem) {
    const router = useRouter();

    async function handleInvite(e: React.MouseEvent) {
        e.stopPropagation();

        if (!notification.entityId) return;

        try {
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
                throw new Error(data.message || "Failed to join.");
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
                description: err instanceof Error ? err.message : "Failed to join workspace.",
                variant: "destructive",
            });
        }
    }

    function navigateToEntity() {
        if (notification.entityId && notification.workspaceId) {
            const base = `/workspaces/${notification.workspaceId}`;

            if (notification.entityType === "DOCUMENT") {
                router.push(`${base}/documents/${notification.entityId}`);
            } else if (notification.entityType === "TASK") {
                router.push(`${base}/tasks/${notification.entityId}`);
            } else if (notification.entityType === "MESSAGE") {
                router.push(`${base}/chat?messageId=${notification.entityId}`);
            } else if (notification.entityType) {
                router.push(
                    `${base}/graph?entityType=${notification.entityType}&entityId=${notification.entityId}`
                );
            } else {
                router.push(base);
            }
        }
    }

    return { handleInvite, navigateToEntity };
}

export function shortTime(now: number, iso: string): string {
    const diff = now - new Date(iso).getTime();

    const m = Math.floor(diff / 60000);

    if (m < 1) return "just now";

    if (m < 60) return `${m}m ago`;

    const h = Math.floor(m / 60);

    if (h < 24) return `${h}h ago`;

    return `${Math.floor(h / 24)}d ago`;
}
