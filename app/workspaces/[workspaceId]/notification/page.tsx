"use client";

import { ChevronLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { NotificationPanel } from "@/app/_components/notification/notification-panel";
import { Button } from "@/components/ui/button";

export default function WorkspaceNotificationPage() {
  const params = useParams<{ workspaceId: string }>();
  const router = useRouter();
  const workspaceId = params.workspaceId;

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/workspaces/${workspaceId}`)}
            className="rounded-md text-muted-foreground"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </div>

        <NotificationPanel workspaceId={workspaceId} />
      </div>
    </div>
  );
}
