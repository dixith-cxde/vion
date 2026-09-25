import { Prisma } from "@/lib/generated/prisma/client";
import type { GitHubWorkspaceEntitySearchResult } from "@/lib/types/github";
import {
  GitHubCommitResponse,
  GitHubIssueSearchResponse,
  fetchGitHubJson,
  fetchIssueDetail,
  fetchPullRequestDetail,
  getConnectedWorkspaceRepositoryFullName,
  getGithubEntityMappingId,
  getWorkspaceRepositoryScopedQuery,
  ingestGitHubCommit,
  listGithubRepositories,
  registerIssueSummary,
  registerPullRequestSummary,
  requireResolvedGithubAccess,
  splitRepositoryFullName,
  toIssueSummary,
  toPullRequestSummary,
} from "../github.service";
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
        repository.mappingId ?? getGithubEntityMappingId("GITHUB_REPOSITORY", repository.fullName),
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
        getWorkspaceRepositoryScopedQuery(connectedRepositoryFullName, `${query} archived:false`)
      )}&sort=updated&order=desc&per_page=${limit}`,
      resolvedAccount.accessToken
    ),
  ]);

  const repoResults = repositories.items.slice(0, 6).map((repository) => ({
    entityType: "GITHUB_REPOSITORY" as const,
    entityId:
      repository.mappingId ?? getGithubEntityMappingId("GITHUB_REPOSITORY", repository.fullName),
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
          message: commitResponse.commit.message.split("\n")[0] ?? commitResponse.sha.slice(0, 7),
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
