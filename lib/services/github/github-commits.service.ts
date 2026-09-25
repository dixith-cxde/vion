import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createRelationship } from "@/lib/services/create-relationship";
import { createActivityMessage } from "@/lib/services/message.service";
import { emitChannelActivity, emitChannelMessage } from "@/lib/socket/chat.events";
import type {} from "@/lib/types/github";
import { GITHUB_COMMIT_TYPE, connectWorkspaceGithubRepository } from "../github.service";
export async function listWorkspaceCommits(workspaceId: string) {
  const commits = await prisma.commit.findMany({
    where: {
      workspaceId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          username: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const relationships = await prisma.relationship.findMany({
    where: {
      workspaceId,
      OR: [
        {
          sourceEntityType: "COMMIT",
          sourceEntityId: {
            in: commits.map((commit) => commit.id),
          },
        },
        {
          targetEntityType: "COMMIT",
          targetEntityId: {
            in: commits.map((commit) => commit.id),
          },
        },
      ],
    },
  });

  return commits.map((commit) => ({
    ...commit,
    relationships: relationships.filter(
      (relationship) =>
        relationship.sourceEntityId === commit.id || relationship.targetEntityId === commit.id
    ),
  }));
}

export async function ingestGitHubCommit({
  workspaceId,
  commitSha,
  message,
  authorUserId,
  authorGithubId,
  authorUsername,
  repositoryFullName,
  channelId,
  metadata,
  links = [],
}: {
  workspaceId: string;
  commitSha: string;
  message: string;
  authorUserId?: string | null;
  authorGithubId?: string;
  authorUsername?: string;
  repositoryFullName?: string;
  channelId?: string;
  metadata?: Prisma.InputJsonValue;
  links?: Array<{
    entityType: "TASK" | "DOCUMENT" | "MESSAGE" | "CHANNEL";
    entityId: string;
    relationshipType?: string;
  }>;
}) {
  const existingMapping = await prisma.externalMapping.findFirst({
    where: {
      externalId: commitSha,
      externalType: GITHUB_COMMIT_TYPE,
      entityType: "COMMIT",
    },
  });

  if (existingMapping) {
    const existingCommit = await prisma.commit.findUnique({
      where: {
        id: existingMapping.entityId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            username: true,
          },
        },
      },
    });

    return {
      commit: existingCommit,
      activityMessage: null,
      relationships: [],
      duplicated: true,
    };
  }

  if (repositoryFullName) {
    await connectWorkspaceGithubRepository({
      workspaceId,
      repositoryFullName,
    });
  }

  let resolvedAuthorId = authorUserId ?? null;

  if (authorGithubId || authorUsername) {
    const githubAccount = await prisma.gitHubAccount.findFirst({
      where: {
        OR: [
          ...(authorGithubId
            ? [
                {
                  githubId: authorGithubId,
                },
              ]
            : []),
          ...(authorUsername
            ? [
                {
                  username: authorUsername,
                },
              ]
            : []),
        ],
      },
      select: {
        userId: true,
      },
    });

    if (githubAccount?.userId) {
      resolvedAuthorId = githubAccount.userId;
    }
  }

  const commit = await prisma.commit.create({
    data: {
      workspaceId,
      message,
      authorId: resolvedAuthorId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          username: true,
        },
      },
    },
  });

  await prisma.externalMapping.create({
    data: {
      externalId: commitSha,
      externalType: GITHUB_COMMIT_TYPE,
      entityType: "COMMIT",
      entityId: commit.id,
    },
  });

  await prisma.activity.create({
    data: {
      entityType: "COMMIT",
      entityId: commit.id,
      action: "GITHUB_COMMIT_INGESTED",
      metadata:
        metadata ??
        ({
          commitSha,
          repositoryFullName,
        } satisfies Prisma.InputJsonValue),
    },
  });

  const targetChannelId =
    channelId ??
    (
      await prisma.channel.findFirst({
        where: {
          workspaceId,
          type: "GROUP",
          deletedAt: null,
          isArchived: false,
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
        },
      })
    )?.id;

  const activityMessage =
    targetChannelId && resolvedAuthorId
      ? await createActivityMessage({
          workspaceId,
          channelId: targetChannelId,
          authorId: resolvedAuthorId,
          content: `GitHub commit linked: ${message}`,
          contentJson:
            metadata ??
            ({
              commitId: commit.id,
              commitSha,
              repositoryFullName,
              kind: "github_commit",
            } satisfies Prisma.InputJsonValue),
        })
      : null;

  if (activityMessage && targetChannelId) {
    emitChannelMessage({
      workspaceId,
      channelId: targetChannelId,
      message: activityMessage,
    });
    emitChannelActivity({
      workspaceId,
      channelId: targetChannelId,
      message: activityMessage,
    });
  }

  const relationships = [];

  if (activityMessage) {
    relationships.push(
      await createRelationship({
        workspaceId,
        sourceEntityType: "MESSAGE",
        sourceEntityId: activityMessage.id,
        targetEntityType: "COMMIT",
        targetEntityId: commit.id,
        relationshipType: "REFERENCES",
      })
    );
  }

  for (const link of links) {
    relationships.push(
      await createRelationship({
        workspaceId,
        sourceEntityType: "COMMIT",
        sourceEntityId: commit.id,
        targetEntityType: link.entityType,
        targetEntityId: link.entityId,
        relationshipType: link.relationshipType ?? "COMMIT_FOR",
      })
    );
  }

  return {
    commit,
    activityMessage,
    relationships,
    duplicated: false,
  };
}
