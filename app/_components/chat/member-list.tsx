"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <div className="border-t">
      <div className="px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Direct Messages
        </h2>
      </div>

      <ScrollArea className="h-[240px]">
        <div className="space-y-1 p-2">
          {isLoading && (
            <p className="px-2 py-1 text-sm text-muted-foreground">Loading members...</p>
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
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted",

                    activeDMUserId === member.user.id && "bg-muted"
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.imageUrl || undefined} />

                    <AvatarFallback>{label.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{label}</p>

                    <p className="truncate text-xs text-muted-foreground">{member.role}</p>
                  </div>
                </button>
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
