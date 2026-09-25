import { prisma } from "@/lib/prisma";
import type {
  GitHubIssueDetail,
  GitHubPullRequestDetail,
  GitHubWorkspaceEntityDetail,
} from "@/lib/types/github";
import {
  GITHUB_COMMIT_TYPE,
  GitHubCommentResponse,
  GitHubCommitResponse,
  GitHubIssueResponse,
  GitHubPullRequestResponse,
  GitHubReviewResponse,
  fetchGitHubJson,
  fetchRepositoryDetail,
  getWorkspaceGithubRepository,
  handleGithubAccessFailure,
  registerIssueSummary,
  registerPullRequestSummary,
  requireResolvedGithubAccess,
  splitRepositoryFullName,
  toCommentSummary,
  toCommitSummary,
  toIssueSummary,
  toPullRequestSummary,
  toReviewSummary,
} from "../github.service";
export async function fetchIssueDetail(
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

export async function fetchPullRequestDetail(
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

export async function resolveMappedGithubEntity(entityId: string) {
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
        mapping.externalId.split("#")[0]?.split("@")[0]?.split(":")[0] ?? mapping.externalId,
      metadata: {
        externalId: mapping.externalId,
      },
    };
  } catch (error) {
    await handleGithubAccessFailure(resolvedAccount.userId, error);
    throw error;
  }
}
