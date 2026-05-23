import crypto from "node:crypto";
import { GitHubConnectionStatus, GitHubOAuthStateStatus } from "@/lib/generated/prisma/enums";
import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const GITHUB_OAUTH_SCOPES = ["repo", "read:org", "user:email"] as const;
const GITHUB_API_BASE_URL = "https://api.github.com";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const OAUTH_STATE_TTL_MS = 1000 * 60 * 10;
const ENCRYPTION_VERSION = "v1";

type GitHubUserProfile = {
  id: number;
  login: string;
  name?: string | null;
  avatar_url?: string | null;
};

type GitHubUserEmail = {
  email: string;
  primary?: boolean;
  verified?: boolean;
};

type GitHubOrg = {
  id: number;
  login: string;
  avatar_url?: string | null;
};

type GitHubOauthTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

function requireGithubEnv(name: "GITHUB_CLIENT_ID" | "GITHUB_CLIENT_SECRET" | "GITHUB_REDIRECT_URI") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function getEncryptionSecret() {
  return (
    process.env.GITHUB_TOKEN_ENCRYPTION_SECRET?.trim() ||
    requireGithubEnv("GITHUB_CLIENT_SECRET")
  );
}

function getEncryptionKey() {
  return crypto.scryptSync(getEncryptionSecret(), "vion-github-token", 32);
}

export function encryptGithubToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptGithubToken(payload: string | null | undefined) {
  if (!payload) {
    return null;
  }

  const [version, ivBase64, authTagBase64, encryptedBase64] = payload.split(".");

  if (
    version !== ENCRYPTION_VERSION ||
    !ivBase64 ||
    !authTagBase64 ||
    !encryptedBase64
  ) {
    throw new Error("Invalid encrypted GitHub token");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivBase64, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function sanitizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  return value;
}

function sanitizeScopes(scopes: string[] | string | null | undefined) {
  const raw = Array.isArray(scopes) ? scopes : typeof scopes === "string" ? scopes.split(",") : [];
  return Array.from(new Set(raw.map((scope) => scope.trim()).filter(Boolean)));
}

async function fetchGithubApi<T>(path: string, accessToken: string): Promise<T> {
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

async function exchangeGithubCodeForToken(code: string) {
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
    throw new Error(payload.error_description || payload.error || "Failed to exchange GitHub OAuth code");
  }

  return {
    accessToken: payload.access_token,
    tokenType: payload.token_type ?? "bearer",
    scopes: sanitizeScopes(payload.scope),
  };
}

async function loadGithubIdentity(accessToken: string) {
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

export async function completeGithubIntegration(params: {
  state: string;
  code: string;
}) {
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
