"use client";

import { Wifi, WifiOff } from "lucide-react";

import { useEditorCollaboration } from "./collaboration-context";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function CollaborationPresence() {
  const { activeUsers, mode, status } = useEditorCollaboration();
  const isLocalMode = mode === "local";

  const statusLabel = isLocalMode
    ? "Local"
    : status === "connected"
      ? "Live"
      : status === "connecting"
        ? "Connecting"
        : "Offline";

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={status === "connected" || isLocalMode ? "secondary" : "outline"}
          className="h-7 gap-1.5 px-2.5 text-[11px]"
        >
          {status === "connected" || isLocalMode ? (
            <Wifi className="size-3" />
          ) : (
            <WifiOff className="size-3" />
          )}
          {statusLabel}
        </Badge>

        <div className="flex items-center">
          {activeUsers.map((user, index) => (
            <Tooltip key={`${user.id}-${user.clientId}`}>
              <TooltipTrigger asChild>
                <div
                  className="-ml-1.5 first:ml-0 flex size-7 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white"
                  style={{
                    backgroundColor: user.color,
                    zIndex: activeUsers.length - index,
                  }}
                >
                  {user.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.imageUrl}
                      alt={user.name}
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                {user.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Badge variant="outline" className="h-7 px-2.5 text-[11px]">
          {activeUsers.length} active
        </Badge>
      </div>
    </TooltipProvider>
  );
}
