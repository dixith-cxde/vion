"use client";

import { MessageSquareText } from "lucide-react";
import { ChannelType } from "@/lib/generated/prisma/enums";
import { useWorkspaceChannels } from "@/lib/hooks/chat/use-workspace-channels";
import { useChatWorkspace } from "./channel-workspace-provider";
import { ChannelList } from "./channel-list";
import { MemberList } from "./member-list";

type ChannelSidebarProps = {
  onSelectChannel: (channelId: string) => void;
  onSelectDM: (userId: string) => void;
};

export function ChannelSidebar({ onSelectChannel, onSelectDM }: ChannelSidebarProps) {
  const { workspaceId, activeChannelId } = useChatWorkspace();

  const { data, isLoading } = useWorkspaceChannels(workspaceId);

  const channels = data?.channels ?? [];

  const groupChannels = channels.filter((channel) => channel.type === ChannelType.GROUP);

  const selfChannels = channels.filter((channel) => channel.type === ChannelType.SELF);

  return (
    <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-muted/20">
      <div className="shrink-0 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground">
            <MessageSquareText className="size-4" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground">Conversations</h2>
            <p className="text-xs text-muted-foreground">Channels and direct messages</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChannelList
          title="Channels"
          emptyLabel="No shared channels yet"
          isLoading={isLoading}
          channels={groupChannels}
          activeChannelId={activeChannelId}
          onSelectChannel={onSelectChannel}
        />

        {selfChannels.length > 0 ? (
          <ChannelList
            title="Personal"
            emptyLabel="No personal spaces yet"
            channels={selfChannels}
            activeChannelId={activeChannelId}
            onSelectChannel={onSelectChannel}
          />
        ) : null}

        <MemberList onSelectUser={onSelectDM} />
      </div>
    </aside>
  );
}
