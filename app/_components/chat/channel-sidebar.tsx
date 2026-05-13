"use client";

import { Plus, MessageSquareText } from "lucide-react";
import { ChannelType } from "@/lib/generated/prisma/enums";
import { useWorkspaceChannels } from "@/lib/hooks/chat/use-workspace-channels";
import { useWorkspaceRoom } from "@/lib/hooks/chat/use-workspace-room";
import { useChannelRealtime } from "@/lib/hooks/chat/use-channel-realtime";
import { Button } from "@/components/ui/button";
import { useChatWorkspace } from "./channel-workspace-provider";
import { ChannelList } from "./channel-list";
import { MemberList } from "./member-list";
import { CreateChannelModal } from "./create-channel-modal";

type ChannelSidebarProps = {
  onSelectChannel: (channelId: string) => void;
  onSelectDM: (userId: string) => void;
};

export function ChannelSidebar({ onSelectChannel, onSelectDM }: ChannelSidebarProps) {
  const { workspaceId, activeChannelId } = useChatWorkspace();

  useWorkspaceRoom(workspaceId);
  useChannelRealtime(workspaceId);

  const { data, isLoading } = useWorkspaceChannels(workspaceId);

  const channels = data?.channels ?? [];

  const sharedChannels = channels.filter((channel) => channel.type === ChannelType.GROUP);

  const selfChannels = channels.filter((channel) => channel.type === ChannelType.SELF);

  const dmChannels = channels.filter((channel) => channel.type === ChannelType.DM);

  return (
    <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-muted/20">
      <div className="shrink-0 border-b border-border/60 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-background/80 text-muted-foreground">
              <MessageSquareText className="size-4" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-foreground">Conversations</h2>

              <p className="text-xs text-muted-foreground">Channels and direct messages</p>
            </div>
          </div>

          <CreateChannelModal>
            <Button size="icon" variant="outline" className="size-9 rounded-xl border-border/60">
              <Plus className="size-4" />
            </Button>
          </CreateChannelModal>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ChannelList
          title="Channels"
          emptyLabel="No shared channels yet"
          isLoading={isLoading}
          channels={sharedChannels}
          activeChannelId={activeChannelId}
          onSelectChannel={onSelectChannel}
        />

        {dmChannels.length > 0 && (
          <ChannelList
            title="Direct messages"
            emptyLabel="No direct messages"
            channels={dmChannels}
            activeChannelId={activeChannelId}
            onSelectChannel={onSelectChannel}
          />
        )}

        {selfChannels.length > 0 && (
          <ChannelList
            title="Personal"
            emptyLabel="No personal spaces yet"
            channels={selfChannels}
            activeChannelId={activeChannelId}
            onSelectChannel={onSelectChannel}
          />
        )}

        <MemberList onSelectUser={onSelectDM} />
      </div>
    </aside>
  );
}
