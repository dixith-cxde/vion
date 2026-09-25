import { chatChannelInclude, getChannelActivityAt } from "@/lib/chat/runtime";
import { prisma } from "@/lib/prisma";
import { ChannelRole, ChannelType, ChannelVisibility } from "@/lib/generated/prisma/enums";
import { ChannelWithMembers } from "../../../types/channel.type";

import { getUnreadCount } from "../channel.service";
export type CreateChannelType = {
  workspaceId: string;
  createdById: string;
  name?: string;
  description?: string;
  topic?: string;
  type: ChannelType;
  visibility: ChannelVisibility;
  dmKey?: string;
  memberIds: string[];
};

export type CreateDMChannelType = {
  workspaceId: string;
  currentUserId: string;
  targetUserId: string;
};

export type CreateSelfChannelType = {
  workspaceId: string;
  userId: string;
};

export async function createChannel({
  createdById,
  memberIds,
  name,
  description,
  topic,
  type,
  visibility,
  dmKey,
  workspaceId,
}: CreateChannelType): Promise<ChannelWithMembers> {
  let resolvedMemberIds = [...memberIds, createdById];

  if (type === ChannelType.GROUP && visibility === ChannelVisibility.PUBLIC) {
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      select: {
        userId: true,
      },
    });

    resolvedMemberIds = workspaceMembers.map((member) => member.userId);
  }

  const uniqueMemberIds = Array.from(new Set(resolvedMemberIds));

  const validWorkspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      userId: {
        in: uniqueMemberIds,
      },
    },
    select: {
      userId: true,
    },
  });

  const validMemberIds = validWorkspaceMembers.map((member) => member.userId);
  const missingMemberIds = uniqueMemberIds.filter((userId) => !validMemberIds.includes(userId));

  if (missingMemberIds.length > 0) {
    throw new Error("Some users are not members of the workspace.");
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      slug: name?.toLowerCase().trim().replace(/\s+/g, "-"),
      description,
      topic,
      type,
      visibility,
      dmKey,
      workspaceId,
      createdById,
      members: {
        create: validMemberIds.map((userId) => ({
          userId,
          role: userId === createdById ? ChannelRole.ADMIN : ChannelRole.MEMBER,
        })),
      },
    },
    include: chatChannelInclude,
  });

  return {
    ...channel,
    currentMember: channel.members.find((member) => member.userId === createdById) ?? null,
    unreadCount: 0,
    activityAt: getChannelActivityAt(channel),
    typingUserIds: [],
    presenceUserIds: [],
  };
}

export async function createDMChannel({
  targetUserId,
  currentUserId,
  workspaceId,
}: CreateDMChannelType): Promise<ChannelWithMembers> {
  if (targetUserId === currentUserId) {
    throw new Error("Self chat is not possible here");
  }

  const participantKey = [currentUserId, targetUserId].sort().join("_");
  const dmKey = `${workspaceId}:${participantKey}`;

  const existingDM = await prisma.channel.findUnique({
    where: {
      dmKey,
    },
    include: chatChannelInclude,
  });

  if (existingDM) {
    return {
      ...existingDM,
      currentMember: existingDM.members.find((member) => member.userId === currentUserId) ?? null,
      unreadCount: await getUnreadCount(existingDM.id, currentUserId, null),
      activityAt: getChannelActivityAt(existingDM),
      typingUserIds: [],
      presenceUserIds: [],
    };
  }

  const legacyDM = await prisma.channel.findFirst({
    where: {
      workspaceId,
      type: ChannelType.DM,
      deletedAt: null,
      OR: [
        {
          dmKey: participantKey,
        },
        {
          AND: [
            {
              members: {
                some: {
                  userId: currentUserId,
                },
              },
            },
            {
              members: {
                some: {
                  userId: targetUserId,
                },
              },
            },
          ],
        },
      ],
    },
    include: chatChannelInclude,
  });

  if (legacyDM) {
    if (legacyDM.dmKey !== dmKey) {
      await prisma.channel.update({
        where: {
          id: legacyDM.id,
        },
        data: {
          dmKey,
        },
      });
    }

    return {
      ...legacyDM,
      dmKey,
      currentMember: legacyDM.members.find((member) => member.userId === currentUserId) ?? null,
      unreadCount: await getUnreadCount(legacyDM.id, currentUserId, null),
      activityAt: getChannelActivityAt(legacyDM),
      typingUserIds: [],
      presenceUserIds: [],
    };
  }

  return createChannel({
    workspaceId,
    createdById: currentUserId,
    memberIds: [targetUserId],
    type: ChannelType.DM,
    visibility: ChannelVisibility.PRIVATE,
    dmKey,
  });
}

export async function createSelfChannel({
  workspaceId,
  userId,
}: CreateSelfChannelType): Promise<ChannelWithMembers> {
  const existingSelfChannel = await prisma.channel.findFirst({
    where: {
      workspaceId,
      type: ChannelType.SELF,
      members: {
        some: {
          userId,
        },
      },
    },
    include: chatChannelInclude,
  });

  if (existingSelfChannel) {
    return {
      ...existingSelfChannel,
      currentMember: existingSelfChannel.members.find((member) => member.userId === userId) ?? null,
      unreadCount: 0,
      activityAt: getChannelActivityAt(existingSelfChannel),
      typingUserIds: [],
      presenceUserIds: [],
    };
  }

  return createChannel({
    workspaceId,
    createdById: userId,
    type: ChannelType.SELF,
    visibility: ChannelVisibility.PRIVATE,
    memberIds: [],
  });
}
