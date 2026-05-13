"use client";

import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelType } from "@/lib/generated/prisma/enums";
import { useWorkspaceChannels } from "@/lib/hooks/chat/use-workspace-channels";
import { ChannelWithRelations } from "@/types/channel.type";
import { useChatWorkspace } from "./channel-workspace-provider";
import { MemberList } from "./member-list";

type ChannelSidebarProps = {
  onSelectDM: (userId: string) => void;
};

export function ChannelSidebar({ onSelectDM }: ChannelSidebarProps) {
  const { workspaceId, activeChannelId, setActiveChannelId } = useChatWorkspace();

  const { data, isLoading } = useWorkspaceChannels(workspaceId);

  const channels = data?.channels ?? [];

  const groupChannels = channels.filter((channel) => channel.type === ChannelType.GROUP);

  const selfChannels = channels.filter((channel) => channel.type === ChannelType.SELF);

  return (
    <aside className="flex w-72 flex-col border-r bg-muted/30">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Conversations</h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Channels
          </h3>
        </div>

        <div className="flex flex-col gap-1 px-2">
          {isLoading && (
            <p className="px-2 py-1 text-sm text-muted-foreground">Loading channels...</p>
          )}

          {groupChannels.map((channel: ChannelWithRelations) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannelId(channel.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",

                activeChannelId === channel.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Hash className="h-4 w-4" />

              <span className="truncate">{channel.name}</span>
            </button>
          ))}

          {selfChannels.map((channel: ChannelWithRelations) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannelId(channel.id)}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm transition-colors",

                activeChannelId === channel.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              {`${channel.members[0]?.user.username ?? "user"} (self)`}
            </button>
          ))}
        </div>

        <MemberList onSelectUser={onSelectDM} />
      </div>
    </aside>
  );
}
