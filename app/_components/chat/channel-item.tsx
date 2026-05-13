"use client";

import { Hash, Lock, MessageSquareText } from "lucide-react";
import { ChannelType } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { ChannelWithRelations } from "@/types/channel.type";

type ChannelItemProps = {
  channel: ChannelWithRelations;
  isActive: boolean;
  onSelect: () => void;
};

export function ChannelItem({ channel, isActive, onSelect }: ChannelItemProps) {
  const isGroupChannel = channel.type === ChannelType.GROUP;
  const Icon = isGroupChannel ? Hash : MessageSquareText;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all",
        "hover:bg-background/70",
        isActive && "bg-background text-foreground ring-1 ring-border/70"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/35 text-muted-foreground",
          isActive && "bg-primary/8 text-primary"
        )}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{channel.name}</p>

        <p className="truncate text-xs text-muted-foreground">
          {isGroupChannel ? "Workspace channel" : "Personal conversation"}
        </p>
      </div>

      {!isGroupChannel ? <Lock className="size-3.5 text-muted-foreground" /> : null}
    </button>
  );
}
