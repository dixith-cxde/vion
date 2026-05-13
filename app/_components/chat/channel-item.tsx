"use client";

import { Hash, Lock, MessageSquareText } from "lucide-react";
import { ChannelType } from "@/lib/generated/prisma/enums";
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

  const otherMember = isDMChannel
    ? channel.members.find((member) => member.user.id !== currentUserId)
    : null;

  const displayName = isDMChannel
    ? otherMember?.user.name || "Unknown user"
    : channel.name || "Untitled channel";

  const description = isDMChannel
    ? otherMember?.user.username
      ? `@${otherMember.user.username}`
      : "Direct message"
    : channel.description || "Workspace channel";

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
        </div>

        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
