"use client";

import { cn } from "@/lib/utils";

import { useWorkspaceChannels } from "@/lib/hooks/chat/use-workspace-channels";

import { ChannelWithRelations } from "@/types/channel.type";
import { ChannelType } from "@/lib/generated/prisma/enums";

type ChannelSidebarProps = {
  workspaceId: string;

  activeChannelId: string | null;

  onSelectChannel: (channelId: string) => void;
};

export function ChannelSidebar({
  workspaceId,
  activeChannelId,
  onSelectChannel,
}: ChannelSidebarProps) {
  const { data, isLoading } = useWorkspaceChannels(workspaceId);

  const channels = data?.channels ?? [];

  return (
    <aside className="w-72 border-r bg-muted/30">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Channels</h2>
      </div>

      <div className="flex flex-col gap-1 p-2">
        {isLoading && (
          <p className="px-2 py-1 text-sm text-muted-foreground">Loading channels...</p>
        )}

        {channels.map((channel: ChannelWithRelations) => (
          <button
            key={channel.id}
            onClick={() => onSelectChannel(channel.id)}
            className={cn(
              "rounded-md px-3 py-2 text-left text-sm transition-colors",

              activeChannelId === channel.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {channel.type === ChannelType.SELF
              ? `${channel.members[0].user.name ?? "user"} (self)`
              : `# ${channel.name}`}
          </button>
        ))}
      </div>
    </aside>
  );
}
