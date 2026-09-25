import { GitHubConnectionStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  GITHUB_API_BASE_URL,
  decryptGithubToken,
  loadGithubIdentity,
} from "../github-integration.service";
export type GitHubUserProfile = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
};

export type GitHubUserEmail = {
  email: string;
  primary?: boolean;
  verified?: boolean;
};

export type GitHubOrg = {
  id: number;
  login: string;
  avatar_url?: string | null;
};

export type GitHubOauthTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};
export function sanitizeScopes(scopes: string[] | string | null | undefined) {
  const raw = Array.isArray(scopes) ? scopes : typeof scopes === "string" ? scopes.split(",") : [];
  return Array.from(new Set(raw.map((scope) => scope.trim()).filter(Boolean)));
}

export async function fetchGithubApi<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "VION",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub API request failed (${response.status}): ${message.slice(0, 240)}`);
  }

  return (await response.json()) as T;
}

export async function getGithubIntegrationAccount(userId: string) {
  return prisma.gitHubAccount.findUnique({
    where: {
      userId,
    },
  });
}

export async function getGithubAccessTokenForUser(userId: string) {
  const account = await prisma.gitHubAccount.findUnique({
    where: {
      userId,
    },
  });

  if (!account) {
    return null;
  }

  if (
    account.status !== GitHubConnectionStatus.CONNECTED ||
    account.needsReauth ||
    !account.accessTokenEncrypted
  ) {
    return {
      account,
      accessToken: null,
    };
  }

  return {
    account,
    accessToken: decryptGithubToken(account.accessTokenEncrypted),
  };
}

export async function markGithubIntegrationNeedsReauth(userId: string, reason: string) {
  return prisma.gitHubAccount.updateMany({
    where: {
      userId,
    },
    data: {
      status: GitHubConnectionStatus.REAUTH_REQUIRED,
      needsReauth: true,
      authError: reason,
      accessTokenEncrypted: null,
      accessToken: null,
    },
  });
}

export async function refreshGithubIntegrationMetadata(userId: string, accessToken: string) {
  const identity = await loadGithubIdentity(accessToken);
  const now = new Date();

  return prisma.gitHubAccount.update({
    where: {
      userId,
    },
    data: {
      githubId: identity.githubId,
      username: identity.username,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      organizationSnapshot: identity.organizations.map((organization) => ({
        id: String(organization.id),
        login: organization.login,
        avatarUrl: organization.avatar_url ?? null,
      })) satisfies Prisma.InputJsonValue,
      lastValidatedAt: now,
      authError: null,
    },
  });
}
