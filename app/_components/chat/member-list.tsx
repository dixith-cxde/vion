"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useWorkspaceMembers } from "@/lib/hooks/chat/use-workspace-members";
import { useChatWorkspace } from "./channel-workspace-provider";

type MemberListProps = {
  onSelectUser: (userId: string) => void;
};

export function MemberList({ onSelectUser }: MemberListProps) {
  const { workspaceId, currentUserId, activeDMUserId } = useChatWorkspace();

  const { data: members = [], isLoading } = useWorkspaceMembers(workspaceId);

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border/60">
      <div className="shrink-0 px-5 py-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Direct Messages
          </h2>
          <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px]">
            {members.filter((member) => member.user.id !== currentUserId).length}
          </Badge>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
        <div className="space-y-1">
          {isLoading && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Loading members...</p>
          )}

          {members
            .filter((member) => member.user.id !== currentUserId)
            .map((member) => {
              const label = member.user.username || member.user.name || "User";

              return (
                <button
                  key={member.user.id}
                  onClick={() => onSelectUser(member.user.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors",
                    "hover:bg-background/70",

                    activeDMUserId === member.user.id &&
                      "bg-background text-foreground ring-1 ring-border/70"
                  )}
                >
                  <Avatar className="size-9">
                    <AvatarImage src={member.user.imageUrl || undefined} />

                    <AvatarFallback>{label.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}</p>

                    <p className="truncate text-xs text-muted-foreground">
                      {member.role.toLowerCase()} · Direct message
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
