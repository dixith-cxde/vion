import { getChannelActivityAt, sortChannelsByActivity } from "@/lib/chat/runtime";
import { ChannelWithRelations } from "@/types/channel.type";

function getCurrentMemberForUser(
  channel: ChannelWithRelations,
  currentUserId: string,
  existing?: ChannelWithRelations | null,
) {
  if (channel.currentMember?.userId === currentUserId) {
    return channel.currentMember;
  }

  return (
    channel.members.find((member) => member.userId === currentUserId) ??
    existing?.currentMember ??
    null
  );
}

export function normalizeIncomingChannelForUser(
  channel: ChannelWithRelations,
  currentUserId: string,
  existing?: ChannelWithRelations | null,
): ChannelWithRelations {
  const currentMember = getCurrentMemberForUser(channel, currentUserId, existing);

  return {
    ...channel,
    currentMember,
    unreadCount: existing?.unreadCount ?? channel.unreadCount ?? 0,
    activityAt: channel.activityAt ?? getChannelActivityAt(channel),
    typingUserIds: existing?.typingUserIds ?? channel.typingUserIds ?? [],
    presenceUserIds: existing?.presenceUserIds ?? channel.presenceUserIds ?? [],
  };
}

export function mergeIncomingChannel(
  channels: ChannelWithRelations[],
  incomingChannel: ChannelWithRelations,
  currentUserId: string,
) {
  const existing = channels.find((channel) => channel.id === incomingChannel.id) ?? null;
  const normalizedChannel = normalizeIncomingChannelForUser(
    incomingChannel,
    currentUserId,
    existing,
  );

  const nextChannels = existing
    ? channels.map((channel) =>
        channel.id === normalizedChannel.id ? normalizedChannel : channel,
      )
    : [normalizedChannel, ...channels];

  return sortChannelsByActivity(nextChannels);
}

export function applyWorkspacePresenceToChannels(
  channels: ChannelWithRelations[],
  onlineUserIds: string[],
) {
  const onlineUserIdSet = new Set(onlineUserIds);

  return channels.map((channel) => ({
    ...channel,
    presenceUserIds: channel.members
      .filter((member) => onlineUserIdSet.has(member.userId))
      .map((member) => member.userId),
  }));
}
