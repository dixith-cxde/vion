import { Prisma } from "@/lib/generated/prisma/client";
import { upsertGitHubEntityReference } from "@/lib/entities/mention";
import { prisma } from "@/lib/prisma";
import { createRelationship } from "@/lib/services/create-relationship";
import { createActivityMessage } from "@/lib/services/message.service";
import { emitChannelActivity, emitChannelMessage } from "@/lib/socket/chat.events";
import type { GitHubRepositorySummary } from "@/lib/types/github";
import {
  GITHUB_REPOSITORY_TYPE,
  GitHubRestRepository,
  fetchGitHubJson,
  getWorkspaceGithubRepository,
  handleGithubAccessFailure,
  requireResolvedGithubAccess,
  resolveCurrentGithubAccount,
  splitRepositoryFullName,
  toRepositorySummary,
} from "../github.service";
export async function connectWorkspaceGithubRepository({
  workspaceId,
  repositoryFullName,
  actorId,
}: {
  workspaceId: string;
  repositoryFullName: string;
  actorId?: string;
}) {
  const existing = await getWorkspaceGithubRepository(workspaceId);
  let repositorySummary: GitHubRepositorySummary | null = null;
  let permissionsSnapshot: Prisma.InputJsonValue | undefined;

  try {
    const resolvedAccount = await requireResolvedGithubAccess();
    const { owner, repo } = splitRepositoryFullName(repositoryFullName);
    const repositoryResponse = await fetchGitHubJson<
      GitHubRestRepository & {
        permissions?: Record<string, boolean>;
        owner?: {
          login?: string | null;
          id?: number | null;
          type?: string | null;
        } | null;
      }
    >(`/repos/${owner}/${repo}`, resolvedAccount.accessToken);
    repositorySummary = toRepositorySummary(repositoryResponse);
    permissionsSnapshot = {
      permissions: repositoryResponse.permissions ?? null,
      installationTargetType: repositoryResponse.owner?.type ?? null,
      installationTargetId: repositoryResponse.owner?.id
        ? String(repositoryResponse.owner.id)
        : null,
    } satisfies Prisma.InputJsonValue;
  } catch (error) {
    const resolvedAccount = await resolveCurrentGithubAccount();
    await handleGithubAccessFailure(resolvedAccount.userId, error);
    repositorySummary = null;
  }

  await prisma.gitHubRepositoryConnection.updateMany({
    where: {
      workspaceId,
    },
    data: {
      isPrimary: false,
    },
  });

  const { owner, repo } = splitRepositoryFullName(repositoryFullName);
  const mapping = await prisma.gitHubRepositoryConnection.upsert({
    where: {
      workspaceId_repositoryFullName: {
        workspaceId,
        repositoryFullName,
      },
    },
    update: {
      repositoryName: repo,
      repositoryOwner: owner,
      repositoryExternalId: repositorySummary ? String(repositorySummary.id) : null,
      isPrivate: repositorySummary?.private ?? false,
      isPrimary: true,
      defaultBranch: repositorySummary?.defaultBranch ?? null,
      permissionsSnapshot,
      syncStatus: "ACTIVE",
      lastSyncedAt: new Date(),
      lastActivityAt: repositorySummary?.updatedAt
        ? new Date(repositorySummary.updatedAt)
        : new Date(),
      lastError: null,
      connectedById: actorId ?? null,
    },
    create: {
      workspaceId,
      repositoryFullName,
      repositoryName: repo,
      repositoryOwner: owner,
      repositoryExternalId: repositorySummary ? String(repositorySummary.id) : null,
      isPrivate: repositorySummary?.private ?? false,
      isPrimary: true,
      installationTargetType:
        permissionsSnapshot && typeof permissionsSnapshot === "object" && permissionsSnapshot
          ? ((permissionsSnapshot as { installationTargetType?: string | null })
              .installationTargetType ?? null)
          : null,
      installationTargetId:
        permissionsSnapshot && typeof permissionsSnapshot === "object" && permissionsSnapshot
          ? ((permissionsSnapshot as { installationTargetId?: string | null })
              .installationTargetId ?? null)
          : null,
      defaultBranch: repositorySummary?.defaultBranch ?? null,
      permissionsSnapshot,
      syncStatus: "ACTIVE",
      lastSyncedAt: new Date(),
      lastActivityAt: repositorySummary?.updatedAt
        ? new Date(repositorySummary.updatedAt)
        : new Date(),
      connectedById: actorId ?? null,
    },
  });

  if (existing?.id && existing.id !== mapping.id) {
    await prisma.externalMapping.updateMany({
      where: {
        entityType: "WORKSPACE",
        entityId: workspaceId,
        externalType: GITHUB_REPOSITORY_TYPE,
      },
      data: {
        externalId: repositoryFullName,
      },
    });
  } else {
    await prisma.externalMapping.upsert({
      where: {
        id: `workspace:${workspaceId}:github:primary-repository`,
      },
      update: {
        externalId: repositoryFullName,
        externalType: GITHUB_REPOSITORY_TYPE,
        entityType: "WORKSPACE",
        entityId: workspaceId,
      },
      create: {
        id: `workspace:${workspaceId}:github:primary-repository`,
        externalId: repositoryFullName,
        externalType: GITHUB_REPOSITORY_TYPE,
        entityType: "WORKSPACE",
        entityId: workspaceId,
      },
    });
  }

  await prisma.activity.create({
    data: {
      entityType: "WORKSPACE",
      entityId: workspaceId,
      action: "GITHUB_REPOSITORY_CONNECTED",
      metadata: {
        repositoryFullName,
      } satisfies Prisma.InputJsonValue,
    },
  });

  const repositoryEntity = await upsertGitHubEntityReference({
    type: "GITHUB_REPOSITORY",
    externalId: repositoryFullName,
    title: repositorySummary?.fullName ?? repositoryFullName,
    repositoryFullName,
    subtitle: repositorySummary?.description ?? "Connected GitHub repository",
  });

  await createRelationship({
    workspaceId,
    sourceEntityType: "WORKSPACE",
    sourceEntityId: workspaceId,
    targetEntityType: "GITHUB_REPOSITORY",
    targetEntityId: repositoryEntity.id,
    relationshipType: "REFERENCES",
  });

  if (actorId) {
    const activityChannel = await prisma.channel.findFirst({
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
    });

    if (activityChannel) {
      const activityMessage = await createActivityMessage({
        workspaceId,
        channelId: activityChannel.id,
        authorId: actorId,
        content: `GitHub repository connected: ${repositoryFullName}`,
        contentJson: {
          repositoryFullName,
          kind: "github_repository_connected",
        } satisfies Prisma.InputJsonValue,
      });

      emitChannelMessage({
        workspaceId,
        channelId: activityChannel.id,
        message: activityMessage,
      });
      emitChannelActivity({
        workspaceId,
        channelId: activityChannel.id,
        message: activityMessage,
      });
    }
  }

  return {
    id: mapping.id,
    externalId: mapping.repositoryFullName,
    externalType: GITHUB_REPOSITORY_TYPE,
    entityType: "WORKSPACE",
    entityId: workspaceId,
  };
}
