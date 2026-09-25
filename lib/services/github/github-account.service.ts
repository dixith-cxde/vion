import { prisma } from "@/lib/prisma";
import {
  disconnectGithubIntegration,
  encryptGithubToken,
  getGithubAccessTokenForUser,
  getGithubIntegrationAccount,
} from "@/lib/services/github-integration.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import type { GitHubAccountSummary } from "@/lib/types/github";
import {
  GITHUB_ACCOUNT_TYPE,
  ResolvedGithubAccount,
  getWorkspaceGithubRepository,
} from "../github.service";
export function sanitizeScopes(scopes: string[] | null | undefined) {
  return Array.from(new Set((scopes ?? []).map((scope) => scope.trim()).filter(Boolean)));
}

export async function resolveCurrentGithubAccount(): Promise<ResolvedGithubAccount> {
  const currentUser = await getCurrentDBUser();

  if (!currentUser) {
    return {
      userId: null,
      summary: {
        connected: false,
        accessTokenAvailable: false,
        source: "none",
        username: null,
        githubId: null,
        email: null,
        avatarUrl: null,
        scopes: [],
        status: "DISCONNECTED",
        needsReconnect: false,
        lastValidatedAt: null,
        connectedAt: null,
        authError: null,
      },
      accessToken: null,
    };
  }

  const resolved = await getGithubAccessTokenForUser(currentUser.id);

  if (!resolved?.account) {
    return {
      userId: currentUser.id,
      summary: {
        connected: false,
        accessTokenAvailable: false,
        source: "none",
        username: null,
        githubId: null,
        email: null,
        avatarUrl: null,
        scopes: [],
        status: "DISCONNECTED",
        needsReconnect: false,
        lastValidatedAt: null,
        connectedAt: null,
        authError: null,
      },
      accessToken: null,
    };
  }

  return {
    userId: currentUser.id,
    summary: {
      connected: resolved.account.status === "CONNECTED",
      accessTokenAvailable: Boolean(resolved.accessToken),
      source: "github_oauth",
      username: resolved.account.username,
      githubId: resolved.account.githubId,
      email: resolved.account.email ?? null,
      avatarUrl: resolved.account.avatarUrl ?? null,
      scopes: sanitizeScopes(
        Array.isArray(resolved.account.scopes)
          ? resolved.account.scopes.filter((scope): scope is string => typeof scope === "string")
          : []
      ),
      status: resolved.account.status,
      needsReconnect: resolved.account.needsReauth,
      lastValidatedAt: resolved.account.lastValidatedAt?.toISOString() ?? null,
      connectedAt: resolved.account.connectedAt?.toISOString() ?? null,
      authError: resolved.account.authError ?? null,
    },
    accessToken: resolved.accessToken,
  };
}

export async function requireResolvedGithubAccess(): Promise<
  ResolvedGithubAccount & {
    summary: GitHubAccountSummary & {
      connected: true;
      accessTokenAvailable: true;
    };
    accessToken: string;
  }
> {
  const resolvedAccount = await resolveCurrentGithubAccount();

  if (!resolvedAccount.summary.connected || !resolvedAccount.accessToken) {
    throw new Error("GitHub account is not connected");
  }

  return resolvedAccount as ResolvedGithubAccount & {
    summary: GitHubAccountSummary & {
      connected: true;
      accessTokenAvailable: true;
    };
    accessToken: string;
  };
}

export async function getConnectedWorkspaceRepositoryFullName(workspaceId: string) {
  const mapping = await getWorkspaceGithubRepository(workspaceId);

  return mapping?.externalId ?? null;
}

export async function getGithubAccount(userId: string) {
  return getGithubIntegrationAccount(userId);
}

export async function linkGithubAccount({
  userId,
  githubId,
  username,
  accessToken,
}: {
  userId: string;
  githubId: string;
  username: string;
  accessToken: string;
}) {
  const account = await prisma.gitHubAccount.upsert({
    where: {
      userId,
    },
    update: {
      githubId,
      username,
      accessToken: null,
      accessTokenEncrypted: encryptGithubToken(accessToken),
      status: "CONNECTED",
      needsReauth: false,
      authError: null,
      connectedAt: new Date(),
    },
    create: {
      userId,
      githubId,
      username,
      accessTokenEncrypted: encryptGithubToken(accessToken),
      status: "CONNECTED",
      connectedAt: new Date(),
    },
  });

  await prisma.externalMapping.upsert({
    where: {
      id: `${userId}:${GITHUB_ACCOUNT_TYPE}`,
    },
    update: {
      externalId: githubId,
      externalType: GITHUB_ACCOUNT_TYPE,
      entityType: "USER",
      entityId: userId,
    },
    create: {
      id: `${userId}:${GITHUB_ACCOUNT_TYPE}`,
      externalId: githubId,
      externalType: GITHUB_ACCOUNT_TYPE,
      entityType: "USER",
      entityId: userId,
    },
  });

  return account;
}

export async function unlinkGithubAccount(userId: string) {
  await prisma.externalMapping.deleteMany({
    where: {
      entityType: "USER",
      entityId: userId,
      externalType: GITHUB_ACCOUNT_TYPE,
    },
  });

  await disconnectGithubIntegration(userId);
}
