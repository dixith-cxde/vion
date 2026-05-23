import { createNotification } from "@/lib/services/notification.service";
import { prisma } from "@/lib/prisma";

type SyncSourceEntityType = "TASK" | "DOCUMENT" | "MESSAGE";

type SyncMention = {
  entityType: string;
  entityId: string;
};

const REFERENCE_ENTITY_TYPES = new Set([
  "TASK",
  "DOCUMENT",
  "CHANNEL",
  "MESSAGE",
  "COMMIT",
  "GITHUB_REPOSITORY",
  "GITHUB_PULL_REQUEST",
  "GITHUB_ISSUE",
  "GITHUB_DISCUSSION",
  "GITHUB_RELEASE",
  "GITHUB_BRANCH",
]);

export function partitionEntityMentions(mentions: SyncMention[]) {
  const uniqueMentions = Array.from(
    new Map(
      mentions
        .filter((mention) => mention.entityType && mention.entityId)
        .map((mention) => [`${mention.entityType}:${mention.entityId}`, mention]),
    ).values(),
  );

  return {
    userMentions: uniqueMentions.filter((mention) => mention.entityType === "USER"),
    referenceMentions: uniqueMentions.filter((mention) => REFERENCE_ENTITY_TYPES.has(mention.entityType)),
  };
}

export async function syncEntityMentions(params: {
  workspaceId: string;
  sourceEntityType: SyncSourceEntityType;
  sourceEntityId: string;
  mentions: SyncMention[];
  actorId?: string | null;
  notificationEntityType?: string;
  notificationEntityId?: string;
  notificationTitle?: string;
  notificationMessage?: string;
}) {
  const {
    workspaceId,
    sourceEntityType,
    sourceEntityId,
    mentions,
    actorId,
    notificationEntityType,
    notificationEntityId,
    notificationTitle = "You were mentioned",
    notificationMessage = "You were mentioned in a collaborative entity.",
  } = params;

  const { referenceMentions, userMentions } = partitionEntityMentions(mentions);
  const [tasks, documents, channels, messages, commits, workspaceMembers, githubMappings] =
    await Promise.all([
      prisma.task.findMany({
        where: {
          workspaceId,
          id: {
            in: referenceMentions.filter((mention) => mention.entityType === "TASK").map((mention) => mention.entityId),
          },
        },
        select: { id: true },
      }),
      prisma.document.findMany({
        where: {
          workspaceId,
          id: {
            in: referenceMentions
              .filter((mention) => mention.entityType === "DOCUMENT")
              .map((mention) => mention.entityId),
          },
        },
        select: { id: true },
      }),
      prisma.channel.findMany({
        where: {
          workspaceId,
          id: {
            in: referenceMentions.filter((mention) => mention.entityType === "CHANNEL").map((mention) => mention.entityId),
          },
        },
        select: { id: true },
      }),
      prisma.message.findMany({
        where: {
          workspaceId,
          id: {
            in: referenceMentions.filter((mention) => mention.entityType === "MESSAGE").map((mention) => mention.entityId),
          },
        },
        select: { id: true },
      }),
      prisma.commit.findMany({
        where: {
          workspaceId,
          id: {
            in: referenceMentions.filter((mention) => mention.entityType === "COMMIT").map((mention) => mention.entityId),
          },
        },
        select: { id: true },
      }),
      prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          userId: {
            in: userMentions.map((mention) => mention.entityId),
          },
        },
        select: { userId: true },
      }),
      prisma.externalMapping.findMany({
        where: {
          id: {
            in: referenceMentions
              .filter((mention) => mention.entityType.startsWith("GITHUB_"))
              .map((mention) => mention.entityId),
          },
          entityType: {
            in: [
              "GITHUB_REPOSITORY",
              "GITHUB_PULL_REQUEST",
              "GITHUB_ISSUE",
              "GITHUB_DISCUSSION",
              "GITHUB_RELEASE",
              "GITHUB_BRANCH",
            ],
          },
        },
        select: { id: true },
      }),
    ]);

  const validReferenceKeys = new Set<string>([
    ...tasks.map((item) => `TASK:${item.id}`),
    ...documents.map((item) => `DOCUMENT:${item.id}`),
    ...channels.map((item) => `CHANNEL:${item.id}`),
    ...messages.map((item) => `MESSAGE:${item.id}`),
    ...commits.map((item) => `COMMIT:${item.id}`),
    ...githubMappings.map((item) => {
      const match = referenceMentions.find((mention) => mention.entityId === item.id);
      return `${match?.entityType ?? "GITHUB"}:${item.id}`;
    }),
  ]);
  const validUserIds = new Set(workspaceMembers.map((item) => item.userId));
  const validatedReferenceMentions = referenceMentions.filter((mention) =>
    validReferenceKeys.has(`${mention.entityType}:${mention.entityId}`),
  );
  const validatedUserMentions = userMentions.filter((mention) => validUserIds.has(mention.entityId));

  const [existingReferences, existingUserMentions] = await Promise.all([
    prisma.relationship.findMany({
      where: {
        workspaceId,
        sourceEntityType,
        sourceEntityId,
        relationshipType: "REFERENCES",
      },
      select: {
        id: true,
        targetEntityType: true,
        targetEntityId: true,
      },
    }),
    prisma.relationship.findMany({
      where: {
        workspaceId,
        sourceEntityType,
        sourceEntityId,
        relationshipType: "MENTIONS",
        targetEntityType: "USER",
      },
      select: {
        id: true,
        targetEntityId: true,
      },
    }),
  ]);

  const nextReferenceKeys = new Set(
    validatedReferenceMentions.map((mention) => `${mention.entityType}:${mention.entityId}`),
  );
  const existingReferenceKeys = new Set(
    existingReferences.map((relationship) => `${relationship.targetEntityType}:${relationship.targetEntityId}`),
  );
  const referenceIdsToDelete = existingReferences
    .filter(
      (relationship) =>
        !nextReferenceKeys.has(`${relationship.targetEntityType}:${relationship.targetEntityId}`),
    )
    .map((relationship) => relationship.id);
  const referencesToCreate = validatedReferenceMentions.filter(
    (mention) => !existingReferenceKeys.has(`${mention.entityType}:${mention.entityId}`),
  );

  const nextUserIds = new Set(validatedUserMentions.map((mention) => mention.entityId));
  const existingUserIds = new Set(existingUserMentions.map((relationship) => relationship.targetEntityId));
  const userMentionIdsToDelete = existingUserMentions
    .filter((relationship) => !nextUserIds.has(relationship.targetEntityId))
    .map((relationship) => relationship.id);
  const userMentionsToCreate = validatedUserMentions.filter(
    (mention) => !existingUserIds.has(mention.entityId),
  );

  await prisma.$transaction(async (tx) => {
    if (referenceIdsToDelete.length > 0) {
      await tx.relationship.deleteMany({
        where: {
          id: { in: referenceIdsToDelete },
        },
      });
    }

    if (referencesToCreate.length > 0) {
      await tx.relationship.createMany({
        data: referencesToCreate.map((mention) => ({
          workspaceId,
          sourceEntityType,
          sourceEntityId,
          targetEntityType: mention.entityType,
          targetEntityId: mention.entityId,
          relationshipType: "REFERENCES",
        })),
      });
    }

    if (userMentionIdsToDelete.length > 0) {
      await tx.notification.deleteMany({
        where: {
          relationshipId: {
            in: userMentionIdsToDelete,
          },
        },
      });

      await tx.relationship.deleteMany({
        where: {
          id: {
            in: userMentionIdsToDelete,
          },
        },
      });
    }
  });

  for (const mention of userMentionsToCreate) {
    const relationship = await prisma.relationship.create({
      data: {
        workspaceId,
        sourceEntityType,
        sourceEntityId,
        targetEntityType: "USER",
        targetEntityId: mention.entityId,
        relationshipType: "MENTIONS",
      },
    });

    if (actorId && mention.entityId !== actorId) {
      await createNotification({
        userId: mention.entityId,
        senderId: actorId,
        workspaceId,
        type: "MENTIONED",
        title: notificationTitle,
        message: notificationMessage,
        entityType: notificationEntityType ?? sourceEntityType,
        entityId: notificationEntityId ?? sourceEntityId,
        relationshipId: relationship.id,
      });
    }
  }

  return {
    createdReferences: referencesToCreate.length,
    deletedReferences: referenceIdsToDelete.length,
    createdUserMentions: userMentionsToCreate.length,
    deletedUserMentions: userMentionIdsToDelete.length,
  };
}
