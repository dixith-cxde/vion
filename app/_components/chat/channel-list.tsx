"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ChannelWithRelations } from "@/types/channel.type";
import { ChannelItem } from "./channel-item";

type ChannelListProps = {
  activeChannelId: string | null;
  channels: ChannelWithRelations[];
  emptyLabel: string;
  isLoading?: boolean;
  onSelectChannel: (channelId: string) => void;
  title: string;
};

export function ChannelList({
  activeChannelId,
  channels,
  emptyLabel,
  isLoading = false,
  onSelectChannel,
  title,
}: ChannelListProps) {
  return (
    <div className="min-h-0 shrink-0 border-b border-border/60 last:border-b-0">
      <div className="px-5 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      </div>

      <ScrollArea className="h-56 px-2 pb-3">
        <div className="space-y-1">
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Loading channels...</p>
          ) : null}

          {!isLoading && channels.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>
          ) : null}

          {channels.map((channel) => (
            <ChannelItem
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              onSelect={() => onSelectChannel(channel.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
