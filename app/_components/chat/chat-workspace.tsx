"use client";

import { useEffect, useMemo, useState } from "react";
import { Channel } from "@/lib/generated/prisma/client";
import { getSocket } from "@/lib/socket/client";
import { useWorkspaceChannels } from "@/lib/hooks/chat/use-workspace-channels";
import { useChannelMessages } from "@/lib/hooks/chat/use-channel-messages";
import { ChatMessage } from "@/types/channel.type";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";

type ChatWorkspaceProps = {
  workspaceId: string;
};

export function ChatWorkspace({ workspaceId }: ChatWorkspaceProps) {
  const { data, isLoading: channelsLoading } = useWorkspaceChannels(workspaceId);

  const channels = data?.channels ?? [];
  console.log(channels);

  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  const activeChannelId = selectedChannelId ?? channels[0]?.id ?? null;

  useEffect(() => {
    if (!activeChannelId) {
      return;
    }

    const socket = getSocket();

    const channelId = activeChannelId;

    socket.emit("channel:join", {
      channelId,
    });

    return () => {
      socket.emit("channel:leave", {
        channelId,
      });
    };
  }, [activeChannelId]);

  const { data: messagesData, isLoading: messagesLoading } = useChannelMessages(
    activeChannelId ?? ""
  );

  const messages: ChatMessage[] = useMemo(() => {
    if (!messagesData) {
      return [];
    }

    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  const activeChannel = channels.find((channel: Channel) => channel.id === activeChannelId);

  return (
    <div className="flex h-full overflow-hidden rounded-xl border bg-background">
      <ChannelSidebar
        workspaceId={workspaceId}
        activeChannelId={activeChannelId}
        onSelectChannel={setSelectedChannelId}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">{activeChannel?.name ?? "Select channel"}</h2>
        </div>

        <MessageList messages={messages} isLoading={messagesLoading} />

        {activeChannelId && (
          <MessageComposer channelId={activeChannelId} workspaceId={workspaceId} />
        )}
      </div>
    </div>
  );
}
