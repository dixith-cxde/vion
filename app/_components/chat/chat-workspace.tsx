"use client";

import { useMemo } from "react";
import { useWorkspaceChannels } from "@/lib/hooks/chat/use-workspace-channels";
import { useChannelMessages } from "@/lib/hooks/chat/use-channel-messages";
import { useCreateDM } from "@/lib/hooks/chat/use-create-dm";
import { useChannelRoom } from "@/lib/hooks/chat/use-channel-room";
import { getSocket } from "@/lib/socket/client";
import { ChatMessage } from "@/types/channel.type";
import { useChatWorkspace } from "./channel-workspace-provider";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";

export function ChatWorkspace() {
  const { workspaceId, activeChannelId, setActiveChannelId, setActiveDMUserId } =
    useChatWorkspace();

  const { data: channelData } = useWorkspaceChannels(workspaceId);

  const channels = channelData?.channels ?? [];

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const resolvedChannelId = activeChannelId ?? channels[0]?.id ?? null;

  useChannelRoom(resolvedChannelId ?? undefined);

  const { data: messagesData, isLoading } = useChannelMessages(resolvedChannelId ?? "");

  const messages: ChatMessage[] = messagesData?.pages.flatMap((page) => page.messages) ?? [];

  const createDM = useCreateDM();

  async function handleSelectDM(targetUserId: string) {
    try {
      setActiveDMUserId(targetUserId);

      const result = await createDM.mutateAsync({
        workspaceId,

        targetUserId,
      });

      const channel = result.data;

      setActiveChannelId(channel.id);

      const socket = getSocket();

      if (!socket) {
        return;
      }

      socket.emit("channel:join", {
        channelId: channel.id,
      });
    } catch (err) {
      console.error("FAILED_TO_OPEN_DM", err);
    }
  }

  return (
    <div className="flex h-full overflow-hidden rounded-xl border bg-background">
      <ChannelSidebar onSelectDM={handleSelectDM} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">{activeChannel?.name ?? "Conversation"}</h2>
        </div>

        <MessageList messages={messages} isLoading={isLoading} />

        {resolvedChannelId && (
          <MessageComposer workspaceId={workspaceId} channelId={resolvedChannelId} />
        )}
      </div>
    </div>
  );
}
