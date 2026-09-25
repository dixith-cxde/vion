import type {
  GitHubBranchSummary,
  GitHubDiscussionSummary,
  GitHubIssueSummary,
  GitHubLinkedRepositoryData,
  GitHubPullRequestSummary,
  GitHubReleaseSummary,
  GitHubRepositorySummary,
} from "@/lib/types/github";
import { ensureGitHubEntityReference } from "../github.service";
export async function registerRepositorySummary(repository: GitHubRepositorySummary) {
  const mapping = await ensureGitHubEntityReference({
    type: "GITHUB_REPOSITORY",
    externalId: repository.fullName,
    title: repository.fullName,
    repositoryFullName: repository.fullName,
    subtitle: repository.description ?? "GitHub repository",
  });

  return mapping.id;
}

export async function registerPullRequestSummary(pullRequest: GitHubPullRequestSummary) {
  const mapping = await ensureGitHubEntityReference({
    type: "GITHUB_PULL_REQUEST",
    externalId: `${pullRequest.repositoryFullName}#${pullRequest.number}`,
    title: pullRequest.title,
    repositoryFullName: pullRequest.repositoryFullName,
    subtitle: `PR #${pullRequest.number} • ${pullRequest.state}`,
  });

  return mapping.id;
}

export async function registerIssueSummary(issue: GitHubIssueSummary) {
  const mapping = await ensureGitHubEntityReference({
    type: "GITHUB_ISSUE",
    externalId: `${issue.repositoryFullName}#${issue.number}`,
    title: issue.title,
    repositoryFullName: issue.repositoryFullName,
    subtitle: `Issue #${issue.number} • ${issue.state}`,
  });

  return mapping.id;
}

export async function registerBranchSummary(
  repositoryFullName: string,
  branch: GitHubBranchSummary
) {
  const mapping = await ensureGitHubEntityReference({
    type: "GITHUB_BRANCH",
    externalId: `${repositoryFullName}:${branch.name}`,
    title: branch.name,
    repositoryFullName,
    subtitle: branch.protected ? "Protected branch" : "Branch",
  });

  return mapping.id;
}

export async function registerReleaseSummary(
  repositoryFullName: string,
  release: GitHubReleaseSummary
) {
  const mapping = await ensureGitHubEntityReference({
    type: "GITHUB_RELEASE",
    externalId: `${repositoryFullName}@${release.tagName}`,
    title: release.name ?? release.tagName,
    repositoryFullName,
    subtitle: `Release ${release.tagName}`,
  });

  return mapping.id;
}

export async function registerDiscussionSummary(
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

export async function registerGitHubOverviewEntities(params: {
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
