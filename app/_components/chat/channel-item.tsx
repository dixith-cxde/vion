"use client";

import { Hash, Lock, MessageSquareText } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ChannelType } from "@/lib/generated/prisma/enums";
import { formatMessagePreview } from "@/lib/chat/runtime";
import { useChatWorkspace } from "./channel-workspace-provider";
import { ChannelWithRelations } from "@/types/channel.type";
import { cn } from "@/lib/utils";

type ChannelItemProps = {
  channel: ChannelWithRelations;
  isActive: boolean;
  onSelect: () => void;
};

export function ChannelItem({ channel, isActive, onSelect }: ChannelItemProps) {
  const { currentUserId } = useChatWorkspace();

  const isGroupChannel = channel.type === ChannelType.GROUP;
  const isDMChannel = channel.type === ChannelType.DM;
  const isSelfChannel = channel.type === ChannelType.SELF;

  const otherMember = isDMChannel
    ? channel.members.find((member) => member.user.id !== currentUserId)
    : null;

  const displayName = isSelfChannel
    ? "Your notes"
    : isDMChannel
      ? otherMember?.user.name || "Unknown user"
      : channel.name || "Untitled channel";

  const description = isSelfChannel
    ? "Private space for your messages"
    : isDMChannel
      ? otherMember?.user.username
        ? `@${otherMember.user.username}`
        : "Direct message"
      : channel.description || "Workspace channel";

  const latestMessage = channel.messages[0];
  const preview = formatMessagePreview(latestMessage) || description;
  const hasActivityIndicator =
    channel.typingUserIds.length > 0 || channel.presenceUserIds.some((userId) => userId !== currentUserId);

  const Icon = isGroupChannel ? Hash : MessageSquareText;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-left transition-all",
        "hover:border-border/60 hover:bg-background/70",
        isActive && "border-border/70 bg-background ring-1 ring-border/60"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/35 text-muted-foreground",
          isActive && "bg-primary/8 text-primary"
        )}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>

          {!isGroupChannel && <Lock className="size-3 text-muted-foreground" />}

          {hasActivityIndicator && channel.unreadCount === 0 ? (
            <span className="size-2 rounded-full bg-primary/70" />
          ) : null}

          {channel.unreadCount > 0 ? (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-semibold leading-none text-background">
              {channel.unreadCount > 99 ? "99+" : channel.unreadCount}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <p className="truncate text-xs text-muted-foreground">{preview}</p>
          {latestMessage ? (
            <span className="shrink-0 text-[10px] text-muted-foreground/70">
              {formatDistanceToNowStrict(new Date(channel.activityAt), { addSuffix: false })}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
