"use client";

import { Hash, MessageSquareText } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useWorkspaceChannels } from "@/lib/hooks/chat/use-workspace-channels";
import { useChannelMessages } from "@/lib/hooks/chat/use-channel-messages";
import { useCreateDM } from "@/lib/hooks/chat/use-create-dm";
import { useChannelRoom } from "@/lib/hooks/chat/use-channel-room";
import { getSocket } from "@/lib/socket/client";
import { ChannelType } from "@/lib/generated/prisma/enums";
import { ChatMessage } from "@/types/channel.type";
import { useChatWorkspace } from "./channel-workspace-provider";
import { ChannelSidebar } from "./channel-sidebar";
import { MessageList } from "./message-list";
import { MessageComposer } from "./message-composer";
import { useChatRealtime } from "@/lib/hooks/chat/use-chat-realtime";
import { useMarkChannelRead } from "@/lib/hooks/chat/use-mark-channel-read";

export function ChatWorkspace() {
  const {
    workspaceId,
    activeChannelId,
    currentUserId,
    setActiveChannelId,
    setActiveDMUserId,
  } = useChatWorkspace();

  const { data: channelData } = useWorkspaceChannels(workspaceId);

  const channels = useMemo(() => channelData?.channels ?? [], [channelData?.channels]);

  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? null;

  useEffect(() => {
    if (activeChannelId || channels.length === 0) {
      return;
    }

    const fallbackChannel =
      channels.find((channel) => channel.type === ChannelType.SELF) ?? channels[0] ?? null;

    if (!fallbackChannel) {
      return;
    }

    setActiveDMUserId(null);
    setActiveChannelId(fallbackChannel.id);
  }, [activeChannelId, channels, setActiveChannelId, setActiveDMUserId]);

  const resolvedChannelId = activeChannelId;

  const { typingUserIds, presenceUserIds } = useChatRealtime({
    channelId: resolvedChannelId ?? undefined,
    workspaceId,
    currentUserId,
  });
  useChannelRoom(resolvedChannelId ?? undefined);

  const { data: messagesData, isLoading } = useChannelMessages(resolvedChannelId ?? "");

  const messages: ChatMessage[] = Array.from(
    new Map(
      (messagesData?.pages.flatMap((page) => page.messages) ?? [])
        .filter((message): message is ChatMessage => Boolean(message?.id))
        .map((message) => [message.id, message])
    ).values()
  );

  const latestMessageId = messages[messages.length - 1]?.id ?? null;

  useMarkChannelRead({
    channelId: resolvedChannelId ?? undefined,
    workspaceId,
    latestMessageId,
    lastReadMessageId: activeChannel?.currentMember?.lastReadMessageId ?? null,
  });

  const createDM = useCreateDM();

  function handleSelectChannel(channelId: string) {
    setActiveDMUserId(null);
    setActiveChannelId(channelId);
  }

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
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      <ChannelSidebar onSelectChannel={handleSelectChannel} onSelectDM={handleSelectDM} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--muted)/0.24),_transparent_40%)]">
        <div className="shrink-0 border-b border-border/60 bg-background/85 px-5 py-4 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground">
              {activeChannel?.type === ChannelType.GROUP ? (
                <Hash className="size-4" />
              ) : (
                <MessageSquareText className="size-4" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-foreground">
                {activeChannel
                  ? activeChannel.type === ChannelType.SELF
                    ? "Your notes"
                    : activeChannel.type === ChannelType.DM
                      ? activeChannel.members.find((member) => member.user.id !== currentUserId)?.user
                          .name ?? "Conversation"
                      : activeChannel.name ?? "Conversation"
                  : "Conversation"}
              </h2>

              <p className="truncate text-xs text-muted-foreground">
                {typingUserIds.length > 0
                  ? "Typing..."
                  : presenceUserIds.length > 1
                    ? `${presenceUserIds.length} collaborators active`
                    : activeChannel
                  ? activeChannel.type === ChannelType.GROUP
                    ? "Workspace channel"
                    : activeChannel.type === ChannelType.SELF
                      ? "Private space for your messages"
                    : "Direct conversation"
                  : "Choose a channel or direct message to start collaborating"}
              </p>
            </div>
          </div>
        </div>

        {resolvedChannelId ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <MessageList
              currentUserId={currentUserId}
              messages={messages}
              isLoading={isLoading}
            />

            <MessageComposer workspaceId={workspaceId} channelId={resolvedChannelId} />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6">
            <div className="mx-auto flex max-w-md flex-col items-center text-center">
              <div className="mb-5 flex size-16 items-center justify-center rounded-[22px] border border-border/60 bg-muted/35">
                <MessageSquareText className="size-7 text-muted-foreground" />
              </div>

              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                Select a conversation
              </h3>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose a channel or direct message to start collaborating.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
