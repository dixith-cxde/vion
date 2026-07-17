import { Prisma } from "@/lib/generated/prisma/client";
import { upsertGitHubEntityReference } from "@/lib/entities/mention";
import { prisma } from "@/lib/prisma";
import { createRelationship } from "@/lib/services/create-relationship";
import {
    disconnectGithubIntegration,
    encryptGithubToken,
    getGithubAccessTokenForUser,
    getGithubIntegrationAccount,
    markGithubIntegrationNeedsReauth,
} from "@/lib/services/github-integration.service";
import { createActivityMessage } from "@/lib/services/message.service";
import { getCurrentDBUser } from "@/lib/services/user.service";
import { emitChannelActivity, emitChannelMessage } from "@/lib/socket/chat.events";
import type {
    GitHubAccountSummary,
    GitHubBranchSummary,
    GitHubCommentSummary,
    GitHubCommitSummary,
    GitHubDiscussionSummary,
    GitHubIssueDetail,
    GitHubIssueSummary,
    GitHubLinkedRepositoryData,
    GitHubPageInfo,
    GitHubPullRequestDetail,
    GitHubPullRequestSummary,
    GitHubReleaseSummary,
    GitHubRepositoryDetail,
    GitHubRepositoryListItem,
    GitHubRepositorySummary,
    GitHubReviewSummary,
    GitHubWorkspaceEntityDetail,
    GitHubWorkspaceEntitySearchResult,
    GitHubWorkspaceOverview,
    GitHubWorkspaceRepositoryDirectory,
} from "@/lib/types/github";

const GITHUB_ACCOUNT_TYPE = "GITHUB_ACCOUNT";
const GITHUB_REPOSITORY_TYPE = "GITHUB_REPOSITORY";
const GITHUB_COMMIT_TYPE = "GITHUB_COMMIT";
const GITHUB_API_BASE_URL = "https://api.github.com";

type ResolvedGithubAccount = {
    userId: string | null;
    summary: GitHubAccountSummary;
    accessToken: string | null;
};

type GitHubRestRepository = {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    html_url: string;
    default_branch: string;
    updated_at: string;
    pushed_at: string | null;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
};

type GitHubSearchResultItem = {
    id: number;
    number: number;
    title: string;
    state: string;
    html_url: string;
    updated_at: string;
    created_at: string;
    repository_url: string;
    user?: {
        login?: string | null;
        avatar_url?: string | null;
    } | null;
    pull_request?: Record<string, unknown>;
};

type GitHubRestUser = {
    login?: string | null;
    avatar_url?: string | null;
};

type GitHubCommitResponse = {
    sha: string;
    html_url: string;
    commit: {
        message: string;
        author?: {
            name?: string | null;
            date?: string | null;
        } | null;
    };
};

type GitHubIssueResponse = GitHubSearchResultItem & {
    body?: string | null;
    comments?: number;
};

type GitHubPullRequestResponse = GitHubIssueResponse & {
    draft?: boolean;
    merged_at?: string | null;
    base?: {
        ref?: string | null;
    } | null;
    head?: {
        ref?: string | null;
    } | null;
};

type GitHubBranchResponse = {
    name: string;
    protected: boolean;
};

type GitHubReleaseResponse = {
    id: number;
    name: string | null;
    tag_name: string;
    html_url: string;
    published_at: string | null;
};

type GitHubCommentResponse = {
    id: number;
    body?: string | null;
    html_url: string;
    created_at: string;
    updated_at: string;
    user?: GitHubRestUser | null;
};

type GitHubReviewResponse = {
    id: number;
    state: string;
    body?: string | null;
    html_url: string;
    submitted_at: string | null;
    user?: GitHubRestUser | null;
};

type GitHubRepositorySearchResponse = {
    total_count: number;
    items: GitHubRestRepository[];
};

type GitHubIssueSearchResponse = {
    total_count: number;
    items: GitHubSearchResultItem[];
};

type GitHubDiscussionGraphQlResponse = {
    data?: {
        repository?: {
            discussions?: {
                nodes?: Array<{
                    id: string;
                    number: number;
                    title: string;
                    url: string;
                    updatedAt: string;
                    answerChosenAt: string | null;
                }>;
            };
        };
    };
    errors?: Array<{
        message?: string;
    }>;
};

function getGithubEntityMappingId(type: `GITHUB_${string}`, externalId: string) {
    return `github:${type.toLowerCase()}:${externalId.trim().toLowerCase()}`;
}

async function ensureGitHubEntityReference(params: {
    type:
        | "GITHUB_REPOSITORY"
        | "GITHUB_PULL_REQUEST"
        | "GITHUB_ISSUE"
        | "GITHUB_DISCUSSION"
        | "GITHUB_RELEASE"
        | "GITHUB_BRANCH";
    externalId: string;
    title?: string | null;
    repositoryFullName?: string | null;
    subtitle?: string | null;
}) {
    const mappingId = getGithubEntityMappingId(params.type, params.externalId);
    const existing = await prisma.externalMapping.findUnique({
        where: {
            id: mappingId,
        },
        select: {
            id: true,
        },
    });

    if (existing) {
        return existing;
    }

    return upsertGitHubEntityReference(params);
}

function sanitizeScopes(scopes: string[] | null | undefined) {
    return Array.from(new Set((scopes ?? []).map((scope) => scope.trim()).filter(Boolean)));
}

async function fetchGitHubJson<T>(
    path: string,
    accessToken: string,
    init?: RequestInit
): Promise<T> {
    const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
        ...init,
        cache: "no-store",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "VION",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`GitHub request failed (${response.status}): ${message.slice(0, 240)}`);
    }

    return (await response.json()) as T;
}
async function fetchGitHubOptional<T>(promise: Promise<T>, fallback: T): Promise<T> {
    try {
        return await promise;
    } catch {
        return fallback;
    }
}

async function handleGithubAccessFailure(userId: string | null, error: unknown) {
    if (userId && error instanceof Error && error.message.includes("GitHub request failed (401)")) {
        await markGithubIntegrationNeedsReauth(
            userId,
            "GitHub access expired or was revoked. Reconnect GitHub to continue."
        );
    }
}

async function fetchGitHubDiscussions(
    accessToken: string,
    owner: string,
    repo: string
): Promise<GitHubDiscussionSummary[]> {
    const response = await fetch(`${GITHUB_API_BASE_URL}/graphql`, {
        method: "POST",
        cache: "no-store",
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": "VION",
        },
        body: JSON.stringify({
            query: `
        query RepositoryDiscussions($owner: String!, $name: String!) {
          repository(owner: $owner, name: $name) {
            discussions(first: 6, orderBy: { field: UPDATED_AT, direction: DESC }) {
              nodes {
                id
                number
                title
                url
                updatedAt
                answerChosenAt
              }
            }
          }
        }
      `,
            variables: {
                owner,
                name: repo,
            },
        }),
    });

    if (!response.ok) {
        return [];
    }

    const payload = (await response.json()) as GitHubDiscussionGraphQlResponse;

    if (payload.errors?.length) {
        return [];
    }

    return (payload.data?.repository?.discussions?.nodes ?? []).map((discussion) => ({
        id: discussion.id,
        number: discussion.number,
        title: discussion.title,
        url: discussion.url,
        updatedAt: discussion.updatedAt,
        answerChosen: Boolean(discussion.answerChosenAt),
    }));
}

function toRepositorySummary(repository: GitHubRestRepository): GitHubRepositorySummary {
    return {
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        private: repository.private,
        url: repository.html_url,
        defaultBranch: repository.default_branch,
        updatedAt: repository.updated_at,
        pushedAt: repository.pushed_at,
        stargazers: repository.stargazers_count,
        forks: repository.forks_count,
        openIssues: repository.open_issues_count,
        language: repository.language,
    };
}

function getRepositoryFullNameFromUrl(url: string) {
    return url.replace(`${GITHUB_API_BASE_URL}/repos/`, "");
}

function toPullRequestSummary(item: GitHubSearchResultItem): GitHubPullRequestSummary {
    return {
        id: item.id,
        number: item.number,
        title: item.title,
        state: item.state,
        url: item.html_url,
        repositoryFullName: getRepositoryFullNameFromUrl(item.repository_url),
        updatedAt: item.updated_at,
        createdAt: item.created_at,
        authorLogin: item.user?.login ?? null,
        authorAvatarUrl: item.user?.avatar_url ?? null,
    };
}

function toIssueSummary(item: GitHubSearchResultItem): GitHubIssueSummary {
    return {
        id: item.id,
        number: item.number,
        title: item.title,
        state: item.state,
        url: item.html_url,
        repositoryFullName: getRepositoryFullNameFromUrl(item.repository_url),
        updatedAt: item.updated_at,
        createdAt: item.created_at,
        authorLogin: item.user?.login ?? null,
        authorAvatarUrl: item.user?.avatar_url ?? null,
    };
}

function toCommitSummary(
    repositoryFullName: string,
    commit: GitHubCommitResponse
): GitHubCommitSummary {
    return {
        sha: commit.sha,
        message: commit.commit.message.split("\n")[0] ?? commit.sha.slice(0, 7),
        url: commit.html_url,
        committedAt: commit.commit.author?.date ?? null,
        authorName: commit.commit.author?.name ?? null,
        repositoryFullName,
    };
}

function toCommentSummary(comment: GitHubCommentResponse): GitHubCommentSummary {
    return {
        id: comment.id,
        body: comment.body ?? null,
        url: comment.html_url,
        authorLogin: comment.user?.login ?? null,
        authorAvatarUrl: comment.user?.avatar_url ?? null,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at,
    };
}

function toReviewSummary(review: GitHubReviewResponse): GitHubReviewSummary {
    return {
        id: review.id,
        state: review.state,
        body: review.body ?? null,
        url: review.html_url,
        authorLogin: review.user?.login ?? null,
        submittedAt: review.submitted_at,
    };
}

function splitRepositoryFullName(fullName: string) {
    const [owner, repo] = fullName.split("/");

    if (!owner || !repo) {
        throw new Error("Repository name must be in owner/repo format");
    }

    return {
        owner,
        repo,
    };
}

function buildPaginationInfo(params: {
    page: number;
    perPage: number;
    itemCount: number;
    totalCount?: number | null;
}): GitHubPageInfo {
    return {
        page: params.page,
        perPage: params.perPage,
        hasNextPage: params.itemCount >= params.perPage,
        totalCount: params.totalCount ?? null,
    };
}

function getWorkspaceRepositoryScopedQuery(
    connectedRepositoryFullName: string | null,
    fallback: string
) {
    if (!connectedRepositoryFullName) {
        return fallback;
    }

    return `repo:${connectedRepositoryFullName} ${fallback}`;
}

async function resolveCurrentGithubAccount(): Promise<ResolvedGithubAccount> {
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
                Array.isArray(resolved.account.scopes) ? resolved.account.scopes : []
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

async function requireResolvedGithubAccess(): Promise<
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

async function getConnectedWorkspaceRepositoryFullName(workspaceId: string) {
    const mapping = await getWorkspaceGithubRepository(workspaceId);

    return mapping?.externalId ?? null;
}

async function registerRepositorySummary(repository: GitHubRepositorySummary) {
    const mapping = await ensureGitHubEntityReference({
        type: "GITHUB_REPOSITORY",
        externalId: repository.fullName,
        title: repository.fullName,
        repositoryFullName: repository.fullName,
        subtitle: repository.description ?? "GitHub repository",
    });

    return mapping.id;
}

async function registerPullRequestSummary(pullRequest: GitHubPullRequestSummary) {
    const mapping = await ensureGitHubEntityReference({
        type: "GITHUB_PULL_REQUEST",
        externalId: `${pullRequest.repositoryFullName}#${pullRequest.number}`,
        title: pullRequest.title,
        repositoryFullName: pullRequest.repositoryFullName,
        subtitle: `PR #${pullRequest.number} • ${pullRequest.state}`,
    });

    return mapping.id;
}

async function registerIssueSummary(issue: GitHubIssueSummary) {
    const mapping = await ensureGitHubEntityReference({
        type: "GITHUB_ISSUE",
        externalId: `${issue.repositoryFullName}#${issue.number}`,
        title: issue.title,
        repositoryFullName: issue.repositoryFullName,
        subtitle: `Issue #${issue.number} • ${issue.state}`,
    });

    return mapping.id;
}

async function registerBranchSummary(repositoryFullName: string, branch: GitHubBranchSummary) {
    const mapping = await ensureGitHubEntityReference({
        type: "GITHUB_BRANCH",
        externalId: `${repositoryFullName}:${branch.name}`,
        title: branch.name,
        repositoryFullName,
        subtitle: branch.protected ? "Protected branch" : "Branch",
    });

    return mapping.id;
}

async function registerReleaseSummary(repositoryFullName: string, release: GitHubReleaseSummary) {
    const mapping = await ensureGitHubEntityReference({
        type: "GITHUB_RELEASE",
        externalId: `${repositoryFullName}@${release.tagName}`,
        title: release.name ?? release.tagName,
        repositoryFullName,
        subtitle: `Release ${release.tagName}`,
    });

    return mapping.id;
}

async function registerDiscussionSummary(
    repositoryFullName: string,
    discussion: GitHubDiscussionSummary
) {
    const mapping = await ensureGitHubEntityReference({
        type: "GITHUB_DISCUSSION",
        externalId: `${repositoryFullName}#${discussion.number}`,
        title: discussion.title,
        repositoryFullName,
        subtitle: `Discussion #${discussion.number}`,
    });

    return mapping.id;
}

async function registerGitHubOverviewEntities(params: {
    repositories: GitHubRepositorySummary[];
    pullRequests: GitHubPullRequestSummary[];
    issues: GitHubIssueSummary[];
    linkedRepositoryData: GitHubLinkedRepositoryData | null;
}) {
    const jobs: Promise<unknown>[] = [];

    params.repositories.forEach((repository) => {
        jobs.push(registerRepositorySummary(repository));
    });

    params.pullRequests.forEach((pullRequest) => {
        jobs.push(registerPullRequestSummary(pullRequest));
    });

    params.issues.forEach((issue) => {
        jobs.push(registerIssueSummary(issue));
    });

    if (params.linkedRepositoryData) {
        const { repository, branches, releases, discussions } = params.linkedRepositoryData;

        branches.forEach((branch) => {
            jobs.push(registerBranchSummary(repository.fullName, branch));
        });

        releases.forEach((release) => {
            jobs.push(registerReleaseSummary(repository.fullName, release));
        });

        discussions.forEach((discussion) => {
            jobs.push(registerDiscussionSummary(repository.fullName, discussion));
        });
    }

    await Promise.all(jobs);
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
                permissionsSnapshot &&
                typeof permissionsSnapshot === "object" &&
                permissionsSnapshot
                    ? ((permissionsSnapshot as { installationTargetType?: string | null })
                          .installationTargetType ?? null)
                    : null,
            installationTargetId:
                permissionsSnapshot &&
                typeof permissionsSnapshot === "object" &&
                permissionsSnapshot
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

export async function listGithubRepositories(params: {
    workspaceId: string;
    query?: string;
    page?: number;
    perPage?: number;
}): Promise<GitHubWorkspaceRepositoryDirectory> {
    const { workspaceId } = params;
    const query = params.query?.trim() ?? "";
    const page = Math.max(params.page ?? 1, 1);
    const perPage = Math.min(Math.max(params.perPage ?? 20, 1), 50);
    const resolvedAccount = await requireResolvedGithubAccess();
    const linkedRepositoryFullName = await getConnectedWorkspaceRepositoryFullName(workspaceId);

    try {
        const endpoint = query
            ? `/search/repositories?q=${encodeURIComponent(`${query} fork:true archived:false`)}&sort=updated&order=desc&per_page=${perPage}&page=${page}`
            : `/user/repos?sort=updated&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`;

        const payload = query
            ? await fetchGitHubJson<GitHubRepositorySearchResponse>(
                  endpoint,
                  resolvedAccount.accessToken
              )
            : await fetchGitHubJson<GitHubRestRepository[]>(endpoint, resolvedAccount.accessToken);

        const repositories = Array.isArray(payload)
            ? payload.map(toRepositorySummary)
            : payload.items.map(toRepositorySummary);

        const items: GitHubRepositoryListItem[] = await Promise.all(
            repositories.map(async (repository) => ({
                ...repository,
                isConnected: repository.fullName === linkedRepositoryFullName,
                mappingId: await registerRepositorySummary(repository),
            }))
        );

        return {
            items,
            query,
            pageInfo: buildPaginationInfo({
                page,
                perPage,
                itemCount: repositories.length,
                totalCount: Array.isArray(payload) ? null : payload.total_count,
            }),
        };
    } catch (error) {
        await handleGithubAccessFailure(resolvedAccount.userId, error);
        throw error;
    }
}

async function fetchRepositoryDetail(
    accessToken: string,
    repositoryFullName: string
): Promise<GitHubRepositoryDetail> {
    const { owner, repo } = splitRepositoryFullName(repositoryFullName);

    /*
   | REQUIRED REPOSITORY FETCH
   | This should still fail hard if the repository itself is inaccessible.
   */

    const repositoryResponse = await fetchGitHubJson<GitHubRestRepository>(
        `/repos/${owner}/${repo}`,
        accessToken
    );

    /*
   | OPTIONAL GITHUB FEATURES
   | These should never crash the entire repository runtime.
   */

    const [
        branchesResponse,
        releasesResponse,
        commitsResponse,
        pullRequestsResponse,
        issuesResponse,
        discussions,
    ] = await Promise.all([
        fetchGitHubOptional(
            fetchGitHubJson<GitHubBranchResponse[]>(
                `/repos/${owner}/${repo}/branches?per_page=12`,
                accessToken
            ),
            []
        ),

        fetchGitHubOptional(
            fetchGitHubJson<GitHubReleaseResponse[]>(
                `/repos/${owner}/${repo}/releases?per_page=10`,
                accessToken
            ),
            []
        ),

        fetchGitHubOptional(
            fetchGitHubJson<GitHubCommitResponse[]>(
                `/repos/${owner}/${repo}/commits?per_page=12`,
                accessToken
            ),
            []
        ),

        fetchGitHubOptional(
            fetchGitHubJson<GitHubPullRequestResponse[]>(
                `/repos/${owner}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=10`,
                accessToken
            ),
            []
        ),

        fetchGitHubOptional(
            fetchGitHubJson<GitHubIssueResponse[]>(
                `/repos/${owner}/${repo}/issues?state=all&sort=updated&direction=desc&per_page=10`,
                accessToken
            ),
            []
        ),

        fetchGitHubOptional(fetchGitHubDiscussions(accessToken, owner, repo), []),
    ]);

    const repository = toRepositorySummary(repositoryResponse);

    const branches = branchesResponse.map((branch) => ({
        name: branch.name,
        protected: branch.protected,
    }));

    const releases = releasesResponse.map((release, index) => ({
        id: release.id,
        name: release.name,
        tagName: release.tag_name,
        url: release.html_url,
        publishedAt: release.published_at,
        isLatest: index === 0,
    }));

    const commits = commitsResponse.map((commit) => toCommitSummary(repository.fullName, commit));

    const pullRequests = pullRequestsResponse.map(toPullRequestSummary);

    const issues = issuesResponse.filter((issue) => !issue.pull_request).map(toIssueSummary);

    await registerGitHubOverviewEntities({
        repositories: [repository],
        pullRequests,
        issues,
        linkedRepositoryData: {
            repository,
            branches,
            releases,
            discussions,
            commits,
        },
    });

    return {
        repository,
        branches,
        releases,
        discussions,
        commits,
        pullRequests,
        issues,
    };
}

export async function getGithubRepositoryDetail(params: {
    workspaceId: string;
    repositoryFullName: string;
}) {
    const resolvedAccount = await requireResolvedGithubAccess();
    try {
        const repository = await fetchRepositoryDetail(
            resolvedAccount.accessToken,
            params.repositoryFullName
        );

        const mappingId = await registerRepositorySummary(repository.repository);

        return {
            mappingId,
            repository,
        };
    } catch (error) {
        await handleGithubAccessFailure(resolvedAccount.userId, error);
        throw error;
    }
}

async function fetchIssueDetail(
    accessToken: string,
    repositoryFullName: string,
    issueNumber: number
): Promise<GitHubIssueDetail> {
    const { owner, repo } = splitRepositoryFullName(repositoryFullName);
    const [issueResponse, commentsResponse] = await Promise.all([
        fetchGitHubJson<GitHubIssueResponse>(
            `/repos/${owner}/${repo}/issues/${issueNumber}`,
            accessToken
        ),
        fetchGitHubJson<GitHubCommentResponse[]>(
            `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=20`,
            accessToken
        ),
    ]);

    const issue = toIssueSummary(issueResponse);
    await registerIssueSummary(issue);

    return {
        ...issue,
        body: issueResponse.body ?? null,
        comments: commentsResponse.map(toCommentSummary),
    };
}

async function fetchPullRequestDetail(
    accessToken: string,
    repositoryFullName: string,
    pullRequestNumber: number
): Promise<GitHubPullRequestDetail> {
    const { owner, repo } = splitRepositoryFullName(repositoryFullName);
    const [pullRequestResponse, commentsResponse, reviewsResponse, commitsResponse] =
        await Promise.all([
            fetchGitHubJson<GitHubPullRequestResponse>(
                `/repos/${owner}/${repo}/pulls/${pullRequestNumber}`,
                accessToken
            ),
            fetchGitHubJson<GitHubCommentResponse[]>(
                `/repos/${owner}/${repo}/issues/${pullRequestNumber}/comments?per_page=20`,
                accessToken
            ),
            fetchGitHubJson<GitHubReviewResponse[]>(
                `/repos/${owner}/${repo}/pulls/${pullRequestNumber}/reviews?per_page=20`,
                accessToken
            ),
            fetchGitHubJson<GitHubCommitResponse[]>(
                `/repos/${owner}/${repo}/pulls/${pullRequestNumber}/commits?per_page=20`,
                accessToken
            ),
        ]);

    const pullRequest = toPullRequestSummary(pullRequestResponse);
    await registerPullRequestSummary(pullRequest);

    return {
        ...pullRequest,
        body: pullRequestResponse.body ?? null,
        draft: Boolean(pullRequestResponse.draft),
        merged: Boolean(pullRequestResponse.merged_at),
        baseBranch: pullRequestResponse.base?.ref ?? "unknown",
        headBranch: pullRequestResponse.head?.ref ?? "unknown",
        comments: commentsResponse.map(toCommentSummary),
        reviews: reviewsResponse.map(toReviewSummary),
        commits: commitsResponse.map((commit) => toCommitSummary(repositoryFullName, commit)),
    };
}

async function resolveMappedGithubEntity(entityId: string) {
    return prisma.externalMapping.findUnique({
        where: {
            id: entityId,
        },
        select: {
            id: true,
            entityType: true,
            externalId: true,
        },
    });
}

export async function getGithubEntityDetail(params: {
    workspaceId: string;
    entityType: GitHubWorkspaceEntityDetail["entityType"];
    entityId: string;
}): Promise<GitHubWorkspaceEntityDetail> {
    const resolvedAccount = await requireResolvedGithubAccess();
    try {
        const mapping =
            params.entityType === "COMMIT"
                ? await prisma.externalMapping.findFirst({
                      where: {
                          entityType: "COMMIT",
                          entityId: params.entityId,
                          externalType: GITHUB_COMMIT_TYPE,
                      },
                      select: {
                          entityId: true,
                          externalId: true,
                      },
                  })
                : await resolveMappedGithubEntity(params.entityId);

        if (!mapping) {
            throw new Error("GitHub entity mapping not found");
        }

        if (params.entityType === "GITHUB_REPOSITORY") {
            const repository = await fetchRepositoryDetail(
                resolvedAccount.accessToken,
                mapping.externalId
            );

            return {
                entityType: "GITHUB_REPOSITORY",
                entityId: params.entityId,
                externalId: mapping.externalId,
                title: repository.repository.fullName,
                subtitle: repository.repository.description ?? "GitHub repository",
                url: repository.repository.url,
                repositoryFullName: repository.repository.fullName,
                repository,
            };
        }

        if (params.entityType === "GITHUB_PULL_REQUEST") {
            const [repositoryFullName, numberText] = mapping.externalId.split("#");
            const pullRequest = await fetchPullRequestDetail(
                resolvedAccount.accessToken,
                repositoryFullName,
                Number(numberText)
            );

            return {
                entityType: "GITHUB_PULL_REQUEST",
                entityId: params.entityId,
                externalId: mapping.externalId,
                title: pullRequest.title,
                subtitle: `PR #${pullRequest.number} • ${pullRequest.state}`,
                url: pullRequest.url,
                repositoryFullName,
                pullRequest,
            };
        }

        if (params.entityType === "GITHUB_ISSUE") {
            const [repositoryFullName, numberText] = mapping.externalId.split("#");
            const issue = await fetchIssueDetail(
                resolvedAccount.accessToken,
                repositoryFullName,
                Number(numberText)
            );

            return {
                entityType: "GITHUB_ISSUE",
                entityId: params.entityId,
                externalId: mapping.externalId,
                title: issue.title,
                subtitle: `Issue #${issue.number} • ${issue.state}`,
                url: issue.url,
                repositoryFullName,
                issue,
            };
        }

        if (params.entityType === "COMMIT") {
            const repositoryMapping = await getWorkspaceGithubRepository(params.workspaceId);

            if (!repositoryMapping?.externalId) {
                throw new Error("No workspace GitHub repository connected");
            }

            const { owner, repo } = splitRepositoryFullName(repositoryMapping.externalId);
            const commitResponse = await fetchGitHubJson<GitHubCommitResponse>(
                `/repos/${owner}/${repo}/commits/${mapping.externalId}`,
                resolvedAccount.accessToken
            );
            const commit = toCommitSummary(repositoryMapping.externalId, commitResponse);

            return {
                entityType: "COMMIT",
                entityId: params.entityId,
                externalId: mapping.externalId,
                title: commit.message,
                subtitle: commit.sha.slice(0, 7),
                url: commit.url,
                repositoryFullName: repositoryMapping.externalId,
                commit,
            };
        }

        return {
            entityType: params.entityType,
            entityId: params.entityId,
            externalId: mapping.externalId,
            title: mapping.externalId,
            subtitle: params.entityType.replace("GITHUB_", "GitHub ").toLowerCase(),
            url: null,
            repositoryFullName:
                mapping.externalId.split("#")[0]?.split("@")[0]?.split(":")[0] ??
                mapping.externalId,
            metadata: {
                externalId: mapping.externalId,
            },
        };
    } catch (error) {
        await handleGithubAccessFailure(resolvedAccount.userId, error);
        throw error;
    }
}

export async function searchGithubWorkspaceEntities(params: {
    workspaceId: string;
    query: string;
    limit?: number;
}): Promise<GitHubWorkspaceEntitySearchResult[]> {
    const query = params.query.trim();

    if (!query) {
        return [];
    }

    const limit = Math.min(Math.max(params.limit ?? 12, 1), 25);
    const resolvedAccount = await requireResolvedGithubAccess();
    const connectedRepositoryFullName = await getConnectedWorkspaceRepositoryFullName(
        params.workspaceId
    );
    const normalizedQuery = query.toLowerCase();
    const [prefix, ...rest] = normalizedQuery.split("/");
    const value = rest.join("/").trim();

    const results: GitHubWorkspaceEntitySearchResult[] = [];

    if (prefix === "repo" && value) {
        const repositories = await listGithubRepositories({
            workspaceId: params.workspaceId,
            query: value,
            page: 1,
            perPage: limit,
        });

        return repositories.items.map((repository) => ({
            entityType: "GITHUB_REPOSITORY",
            entityId:
                repository.mappingId ??
                getGithubEntityMappingId("GITHUB_REPOSITORY", repository.fullName),
            externalId: repository.fullName,
            label: repository.fullName,
            preview: repository.description ?? "GitHub repository",
            repositoryFullName: repository.fullName,
            url: repository.url,
        }));
    }

    if ((prefix === "issue" || prefix === "pr") && value) {
        const isNumericReference = /^\d+$/.test(value);

        if (isNumericReference && connectedRepositoryFullName) {
            try {
                if (prefix === "pr") {
                    const pullRequest = await fetchPullRequestDetail(
                        resolvedAccount.accessToken,
                        connectedRepositoryFullName,
                        Number(value)
                    );

                    return [
                        {
                            entityType: "GITHUB_PULL_REQUEST",
                            entityId: getGithubEntityMappingId(
                                "GITHUB_PULL_REQUEST",
                                `${connectedRepositoryFullName}#${pullRequest.number}`
                            ),
                            externalId: `${connectedRepositoryFullName}#${pullRequest.number}`,
                            label: pullRequest.title,
                            preview: `PR #${pullRequest.number} • ${connectedRepositoryFullName}`,
                            repositoryFullName: connectedRepositoryFullName,
                            url: pullRequest.url,
                        },
                    ];
                }

                const issue = await fetchIssueDetail(
                    resolvedAccount.accessToken,
                    connectedRepositoryFullName,
                    Number(value)
                );

                return [
                    {
                        entityType: "GITHUB_ISSUE",
                        entityId: getGithubEntityMappingId(
                            "GITHUB_ISSUE",
                            `${connectedRepositoryFullName}#${issue.number}`
                        ),
                        externalId: `${connectedRepositoryFullName}#${issue.number}`,
                        label: issue.title,
                        preview: `Issue #${issue.number} • ${connectedRepositoryFullName}`,
                        repositoryFullName: connectedRepositoryFullName,
                        url: issue.url,
                    },
                ];
            } catch {
                // Fall back to GitHub search below when direct lookup fails.
            }
        }

        const searchQuery = isNumericReference
            ? getWorkspaceRepositoryScopedQuery(
                  connectedRepositoryFullName,
                  `${prefix === "pr" ? "is:pr" : "is:issue"} ${value} in:title,body`
              )
            : getWorkspaceRepositoryScopedQuery(
                  connectedRepositoryFullName,
                  `${prefix === "pr" ? "is:pr" : "is:issue"} ${value}`
              );
        const payload = await fetchGitHubJson<GitHubIssueSearchResponse>(
            `/search/issues?q=${encodeURIComponent(searchQuery)}&sort=updated&order=desc&per_page=${limit}`,
            resolvedAccount.accessToken
        );

        const items = payload.items
            .filter((item) => (prefix === "pr" ? Boolean(item.pull_request) : !item.pull_request))
            .slice(0, limit);

        for (const item of items) {
            if (prefix === "pr") {
                const summary = toPullRequestSummary(item);
                const entityId = await registerPullRequestSummary(summary);
                results.push({
                    entityType: "GITHUB_PULL_REQUEST",
                    entityId,
                    externalId: `${summary.repositoryFullName}#${summary.number}`,
                    label: summary.title,
                    preview: `PR #${summary.number} • ${summary.repositoryFullName}`,
                    repositoryFullName: summary.repositoryFullName,
                    url: summary.url,
                });
            } else {
                const summary = toIssueSummary(item);
                const entityId = await registerIssueSummary(summary);
                results.push({
                    entityType: "GITHUB_ISSUE",
                    entityId,
                    externalId: `${summary.repositoryFullName}#${summary.number}`,
                    label: summary.title,
                    preview: `Issue #${summary.number} • ${summary.repositoryFullName}`,
                    repositoryFullName: summary.repositoryFullName,
                    url: summary.url,
                });
            }
        }

        return results;
    }

    const [repositories, issuesAndPullRequests] = await Promise.all([
        listGithubRepositories({
            workspaceId: params.workspaceId,
            query,
            page: 1,
            perPage: Math.min(limit, 10),
        }),
        fetchGitHubJson<GitHubIssueSearchResponse>(
            `/search/issues?q=${encodeURIComponent(
                getWorkspaceRepositoryScopedQuery(
                    connectedRepositoryFullName,
                    `${query} archived:false`
                )
            )}&sort=updated&order=desc&per_page=${limit}`,
            resolvedAccount.accessToken
        ),
    ]);

    const repoResults = repositories.items.slice(0, 6).map((repository) => ({
        entityType: "GITHUB_REPOSITORY" as const,
        entityId:
            repository.mappingId ??
            getGithubEntityMappingId("GITHUB_REPOSITORY", repository.fullName),
        externalId: repository.fullName,
        label: repository.fullName,
        preview: repository.description ?? "GitHub repository",
        repositoryFullName: repository.fullName,
        url: repository.url,
    }));

    const issueResults: GitHubWorkspaceEntitySearchResult[] = [];
    for (const item of issuesAndPullRequests.items.slice(0, limit)) {
        if (item.pull_request) {
            const summary = toPullRequestSummary(item);
            const entityId = await registerPullRequestSummary(summary);
            issueResults.push({
                entityType: "GITHUB_PULL_REQUEST",
                entityId,
                externalId: `${summary.repositoryFullName}#${summary.number}`,
                label: summary.title,
                preview: `PR #${summary.number} • ${summary.repositoryFullName}`,
                repositoryFullName: summary.repositoryFullName,
                url: summary.url,
            });
            continue;
        }

        const summary = toIssueSummary(item);
        const entityId = await registerIssueSummary(summary);
        issueResults.push({
            entityType: "GITHUB_ISSUE",
            entityId,
            externalId: `${summary.repositoryFullName}#${summary.number}`,
            label: summary.title,
            preview: `Issue #${summary.number} • ${summary.repositoryFullName}`,
            repositoryFullName: summary.repositoryFullName,
            url: summary.url,
        });
    }

    return [...repoResults, ...issueResults].slice(0, limit);
}

export async function resolveGithubMentionTokens(params: {
    workspaceId: string;
    tokens: Array<{
        entityType: "GITHUB_REPOSITORY" | "GITHUB_PULL_REQUEST" | "GITHUB_ISSUE" | "COMMIT";
        value: string;
    }>;
    actorId?: string | null;
}) {
    const connectedRepositoryFullName = await getConnectedWorkspaceRepositoryFullName(
        params.workspaceId
    );
    const queryResults: GitHubWorkspaceEntitySearchResult[] = [];

    for (const token of params.tokens) {
        if (token.entityType === "COMMIT" && connectedRepositoryFullName) {
            const resolvedAccount = await requireResolvedGithubAccess();
            const { owner, repo } = splitRepositoryFullName(connectedRepositoryFullName);

            try {
                const commitResponse = await fetchGitHubJson<GitHubCommitResponse>(
                    `/repos/${owner}/${repo}/commits/${token.value}`,
                    resolvedAccount.accessToken
                );
                const commit = await ingestGitHubCommit({
                    workspaceId: params.workspaceId,
                    commitSha: commitResponse.sha,
                    message:
                        commitResponse.commit.message.split("\n")[0] ??
                        commitResponse.sha.slice(0, 7),
                    authorUserId: params.actorId ?? null,
                    repositoryFullName: connectedRepositoryFullName,
                    metadata: {
                        commitSha: commitResponse.sha,
                        repositoryFullName: connectedRepositoryFullName,
                        authorName: commitResponse.commit.author?.name ?? null,
                        committedAt: commitResponse.commit.author?.date ?? null,
                    } satisfies Prisma.InputJsonValue,
                });

                if (commit.commit?.id) {
                    queryResults.push({
                        entityType: "COMMIT",
                        entityId: commit.commit.id,
                        externalId: commitResponse.sha,
                        label: commit.commit.message,
                        preview: `Commit • ${connectedRepositoryFullName}`,
                        repositoryFullName: connectedRepositoryFullName,
                        url: commitResponse.html_url,
                    });
                }
            } catch {
                continue;
            }

            continue;
        }

        const prefix =
            token.entityType === "GITHUB_REPOSITORY"
                ? "repo"
                : token.entityType === "GITHUB_PULL_REQUEST"
                  ? "pr"
                  : "issue";

        const results = await searchGithubWorkspaceEntities({
            workspaceId: params.workspaceId,
            query: `${prefix}/${token.value}`,
            limit: 5,
        });

        queryResults.push(
            ...results.filter((result) => result.entityType === token.entityType).slice(0, 1)
        );
    }

    return queryResults;
}

export async function getWorkspaceGithubOverview(
    workspaceId: string
): Promise<GitHubWorkspaceOverview> {
    const [resolvedAccount, workspaceRepositoryMapping, linkedRepositories] = await Promise.all([
        resolveCurrentGithubAccount(),
        getWorkspaceGithubRepository(workspaceId),
        getWorkspaceGithubConnections(workspaceId),
    ]);

    const linkedRepositoryFullName = workspaceRepositoryMapping?.externalId ?? null;

    if (!resolvedAccount.summary.connected || !resolvedAccount.accessToken) {
        return {
            account: resolvedAccount.summary,
            linkedRepository: {
                connected: Boolean(linkedRepositoryFullName),
                fullName: linkedRepositoryFullName,
            },
            linkedRepositories,
            repositories: [],
            pullRequests: [],
            issues: [],
            linkedRepositoryData: null,
            error: resolvedAccount.summary.connected
                ? resolvedAccount.summary.needsReconnect
                    ? resolvedAccount.summary.authError ||
                      "GitHub access requires re-authorization."
                    : "GitHub account is connected, but no repository runtime token is currently available."
                : null,
        };
    }

    try {
        const usernameQuery = resolvedAccount.summary.username
            ? ` involves:${resolvedAccount.summary.username}`
            : "";
        const [repositoriesResponse, pullRequestsResponse, issuesResponse] = await Promise.all([
            fetchGitHubJson<GitHubRestRepository[]>(
                "/user/repos?sort=updated&per_page=12&affiliation=owner,collaborator,organization_member",
                resolvedAccount.accessToken
            ),
            fetchGitHubJson<{ items: GitHubSearchResultItem[] }>(
                `/search/issues?q=${encodeURIComponent(`is:pr archived:false${usernameQuery}`)}&sort=updated&order=desc&per_page=10`,
                resolvedAccount.accessToken
            ),
            fetchGitHubJson<{ items: GitHubSearchResultItem[] }>(
                `/search/issues?q=${encodeURIComponent(`is:issue archived:false${usernameQuery}`)}&sort=updated&order=desc&per_page=10`,
                resolvedAccount.accessToken
            ),
        ]);

        const repositories = repositoriesResponse.map(toRepositorySummary);
        const pullRequests = pullRequestsResponse.items
            .filter((item) => Boolean(item.pull_request))
            .map(toPullRequestSummary);
        const issues = issuesResponse.items
            .filter((item) => !item.pull_request)
            .map(toIssueSummary);

        let linkedRepositoryData: GitHubLinkedRepositoryData | null = null;

        if (linkedRepositoryFullName) {
            const repositoryDetail = await fetchRepositoryDetail(
                resolvedAccount.accessToken,
                linkedRepositoryFullName
            );
            linkedRepositoryData = {
                repository: repositoryDetail.repository,
                branches: repositoryDetail.branches,
                releases: repositoryDetail.releases,
                discussions: repositoryDetail.discussions,
                commits: repositoryDetail.commits,
            };
        }

        await registerGitHubOverviewEntities({
            repositories,
            pullRequests,
            issues,
            linkedRepositoryData,
        });

        return {
            account: resolvedAccount.summary,
            linkedRepository: {
                connected: Boolean(linkedRepositoryFullName),
                fullName: linkedRepositoryFullName,
            },
            linkedRepositories,
            repositories,
            pullRequests,
            issues,
            linkedRepositoryData,
            error: null,
        };
    } catch (error) {
        await handleGithubAccessFailure(resolvedAccount.userId, error);
        console.error("GITHUB_OVERVIEW_FETCH_ERROR", error);

        return {
            account: resolvedAccount.summary,
            linkedRepository: {
                connected: Boolean(linkedRepositoryFullName),
                fullName: linkedRepositoryFullName,
            },
            linkedRepositories,
            repositories: [],
            pullRequests: [],
            issues: [],
            linkedRepositoryData: null,
            error: error instanceof Error ? error.message : "Failed to load GitHub workspace data",
        };
    }
}

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
                relationship.sourceEntityId === commit.id ||
                relationship.targetEntityId === commit.id
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
