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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {channels.length}
          </span>
        </div>
      </div>

      <ScrollArea className="h-56 px-2 pb-3">
        <div className="space-y-1">
          {isLoading ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Loading channels...</p>
          ) : null}

          {!isLoading && channels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 px-3 py-4 text-sm text-muted-foreground">
              {emptyLabel}
            </div>
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
