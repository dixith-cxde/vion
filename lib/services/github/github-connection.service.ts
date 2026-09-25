import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {} from "@/lib/types/github";
import { GITHUB_REPOSITORY_TYPE } from "../github.service";
export async function getWorkspaceGithubRepository(workspaceId: string) {
  const connection = await prisma.gitHubRepositoryConnection.findFirst({
    where: {
      workspaceId,
      isPrimary: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (connection) {
    return {
      id: connection.id,
      externalId: connection.repositoryFullName,
      externalType: GITHUB_REPOSITORY_TYPE,
      entityType: "WORKSPACE",
      entityId: workspaceId,
    };
  }

  return prisma.externalMapping.findFirst({
    where: {
      entityType: "WORKSPACE",
      entityId: workspaceId,
      externalType: GITHUB_REPOSITORY_TYPE,
    },
  });
}

export async function getWorkspaceGithubConnections(workspaceId: string) {
  const connections = await prisma.gitHubRepositoryConnection.findMany({
    where: {
      workspaceId,
    },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
  });

  return connections.map((connection) => ({
    id: connection.id,
    repositoryFullName: connection.repositoryFullName,
    repositoryName: connection.repositoryName,
    repositoryOwner: connection.repositoryOwner,
    isPrivate: connection.isPrivate,
    isPrimary: connection.isPrimary,
    syncStatus: connection.syncStatus,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
    lastActivityAt: connection.lastActivityAt?.toISOString() ?? null,
    lastError: connection.lastError ?? null,
  }));
}

export async function disconnectWorkspaceGithubRepository(params: {
  workspaceId: string;
  repositoryFullName?: string | null;
  actorId?: string;
}) {
  const existingConnections = await prisma.gitHubRepositoryConnection.findMany({
    where: {
      workspaceId: params.workspaceId,
      ...(params.repositoryFullName
        ? {
            repositoryFullName: params.repositoryFullName,
          }
        : {
            isPrimary: true,
          }),
    },
    orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
  });

  const target = existingConnections[0];

  if (!target) {
    return null;
  }

  await prisma.gitHubRepositoryConnection.delete({
    where: {
      id: target.id,
    },
  });

  const nextPrimary = await prisma.gitHubRepositoryConnection.findFirst({
    where: {
      workspaceId: params.workspaceId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (nextPrimary) {
    await prisma.gitHubRepositoryConnection.update({
      where: {
        id: nextPrimary.id,
      },
      data: {
        isPrimary: true,
      },
    });
  }

  if (nextPrimary) {
    await prisma.externalMapping.upsert({
      where: {
        id: `workspace:${params.workspaceId}:github:primary-repository`,
      },
      update: {
        externalId: nextPrimary.repositoryFullName,
      },
      create: {
        id: `workspace:${params.workspaceId}:github:primary-repository`,
        externalId: nextPrimary.repositoryFullName,
        externalType: GITHUB_REPOSITORY_TYPE,
        entityType: "WORKSPACE",
        entityId: params.workspaceId,
      },
    });
  } else {
    await prisma.externalMapping.deleteMany({
      where: {
        entityType: "WORKSPACE",
        entityId: params.workspaceId,
        externalType: GITHUB_REPOSITORY_TYPE,
      },
    });
  }

  await prisma.activity.create({
    data: {
      entityType: "WORKSPACE",
      entityId: params.workspaceId,
      action: "GITHUB_REPOSITORY_DISCONNECTED",
      metadata: {
        repositoryFullName: target.repositoryFullName,
      } satisfies Prisma.InputJsonValue,
    },
  });

  return {
    repositoryFullName: target.repositoryFullName,
    nextPrimary: nextPrimary?.repositoryFullName ?? null,
  };
}
