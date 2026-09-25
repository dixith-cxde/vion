import crypto from "node:crypto";
import { GitHubConnectionStatus, GitHubOAuthStateStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptGithubToken, fetchGithubApi, sanitizeScopes } from "../github-integration.service";
import type {
  GitHubOauthTokenResponse,
  GitHubOrg,
  GitHubUserEmail,
  GitHubUserProfile,
} from "../github-integration.service";
export const GITHUB_OAUTH_SCOPES = ["repo", "read:org", "user:email"] as const;
export const GITHUB_API_BASE_URL = "https://api.github.com";
export const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
export const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;
export function requireGithubEnv(
  name: "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET" | "GITHUB_REDIRECT_URI"
) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

export function sanitizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  return value;
}

export async function exchangeGithubCodeForToken(code: string) {
  const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: requireGithubEnv("GITHUB_CLIENT_ID"),
      client_secret: requireGithubEnv("GITHUB_CLIENT_SECRET"),
      code,
      redirect_uri: requireGithubEnv("GITHUB_REDIRECT_URI"),
    }),
  });

  const payload = (await response.json()) as GitHubOauthTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || payload.error || "Failed to exchange GitHub OAuth code"
    );
  }

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    scopes: sanitizeScopes(payload.scope),
  };
}

export async function loadGithubIdentity(accessToken: string) {
  const [profile, emails, organizations] = await Promise.all([
    fetchGithubApi<GitHubUserProfile>("/user", accessToken),
    fetchGithubApi<GitHubUserEmail[]>("/user/emails", accessToken),
    fetchGithubApi<GitHubOrg[]>("/user/orgs?per_page=100", accessToken).catch(() => []),
  ]);

  const primaryEmail =
    emails.find((email) => email.primary && email.verified)?.email ??
    emails.find((email) => email.verified)?.email ??
    emails[0]?.email ??
    null;

  return {
    githubId: String(profile.id),
    username: profile.login,
    name: profile.name ?? null,
    avatarUrl: profile.avatar_url ?? null,
    email: primaryEmail,
    organizations,
  };
}

export async function startGithubIntegration(params: {
  userId: string;
  workspaceId?: string | null;
  returnTo?: string | null;
}) {
  const state = crypto.randomBytes(24).toString("base64url");
  const returnTo = sanitizeReturnTo(params.returnTo);

  await prisma.gitHubOAuthState.create({
    data: {
      state,
      userId: params.userId,
      workspaceId: params.workspaceId ?? null,
      returnTo,
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    },
  });

  const redirect = new URL("https://github.com/login/oauth/authorize");
  redirect.searchParams.set("client_id", requireGithubEnv("GITHUB_CLIENT_ID"));
  redirect.searchParams.set("redirect_uri", requireGithubEnv("GITHUB_REDIRECT_URI"));
  redirect.searchParams.set("scope", GITHUB_OAUTH_SCOPES.join(" "));
  redirect.searchParams.set("state", state);

  return {
    state,
    url: redirect.toString(),
  };
}

export async function completeGithubIntegration(params: { state: string; code: string }) {
  const oauthState = await prisma.gitHubOAuthState.findUnique({
    where: {
      state: params.state,
    },
  });

  if (!oauthState) {
    throw new Error("Invalid GitHub OAuth state");
  }

  if (oauthState.status !== GitHubOAuthStateStatus.PENDING || oauthState.consumedAt) {
    throw new Error("GitHub OAuth state has already been used");
  }

  if (oauthState.expiresAt.getTime() < Date.now()) {
    await prisma.gitHubOAuthState.update({
      where: {
        id: oauthState.id,
      },
      data: {
        status: GitHubOAuthStateStatus.EXPIRED,
      },
    });

    throw new Error("GitHub OAuth state has expired");
  }

  const token = await exchangeGithubCodeForToken(params.code);
  const identity = await loadGithubIdentity(token.accessToken);
  const now = new Date();
  const permissionSnapshot = {
    scopes: token.scopes,
    tokenType: token.tokenType,
  } satisfies Prisma.InputJsonValue;
  const organizationSnapshot = identity.organizations.map((organization) => ({
    id: String(organization.id),
    login: organization.login,
    avatarUrl: organization.avatar_url ?? null,
  })) satisfies Prisma.InputJsonValue;

  const account = await prisma.gitHubAccount.upsert({
    where: {
      userId: oauthState.userId,
    },
    update: {
      githubId: identity.githubId,
      username: identity.username,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      accessToken: null,
      accessTokenEncrypted: encryptGithubToken(token.accessToken),
      tokenType: token.tokenType,
      scopes: token.scopes,
      status: GitHubConnectionStatus.CONNECTED,
      needsReauth: false,
      authError: null,
      connectedAt: now,
      disconnectedAt: null,
      lastValidatedAt: now,
      permissionSnapshot,
      organizationSnapshot,
    },
    create: {
      userId: oauthState.userId,
      githubId: identity.githubId,
      username: identity.username,
      email: identity.email,
      name: identity.name,
      avatarUrl: identity.avatarUrl,
      accessTokenEncrypted: encryptGithubToken(token.accessToken),
      tokenType: token.tokenType,
      scopes: token.scopes,
      status: GitHubConnectionStatus.CONNECTED,
      connectedAt: now,
      lastValidatedAt: now,
      permissionSnapshot,
      organizationSnapshot,
    },
  });

  await prisma.gitHubOAuthState.update({
    where: {
      id: oauthState.id,
    },
    data: {
      status: GitHubOAuthStateStatus.CONSUMED,
      consumedAt: now,
    },
  });

  await prisma.activity.create({
    data: {
      entityType: "USER",
      entityId: oauthState.userId,
      action: "GITHUB_ACCOUNT_CONNECTED",
      metadata: {
        username: identity.username,
        workspaceId: oauthState.workspaceId ?? null,
      } satisfies Prisma.InputJsonValue,
    },
  });

  return {
    account,
    workspaceId: oauthState.workspaceId,
    returnTo: oauthState.returnTo,
  };
}

export async function disconnectGithubIntegration(userId: string) {
  const account = await prisma.gitHubAccount.findUnique({
    where: {
      userId,
    },
  });

  if (!account) {
    return null;
  }

  const now = new Date();

  return prisma.gitHubAccount.update({
    where: {
      userId,
    },
    data: {
      accessToken: null,
      accessTokenEncrypted: null,
      status: GitHubConnectionStatus.DISCONNECTED,
      needsReauth: false,
      authError: null,
      disconnectedAt: now,
    },
  });
}
