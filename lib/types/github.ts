export type GitHubAccountSummary = {
  connected: boolean;
  accessTokenAvailable: boolean;
  source: "github_oauth" | "database" | "none";
  username: string | null;
  githubId: string | null;
  email: string | null;
  avatarUrl: string | null;
  scopes: string[];
  status: "PENDING" | "CONNECTED" | "REAUTH_REQUIRED" | "DISCONNECTED";
  needsReconnect: boolean;
  lastValidatedAt: string | null;
  connectedAt: string | null;
  authError: string | null;
};

export type GitHubWorkspaceConnectionSummary = {
  id: string;
  repositoryFullName: string;
  repositoryName: string;
  repositoryOwner: string;
  isPrivate: boolean;
  isPrimary: boolean;
  syncStatus: "PENDING" | "ACTIVE" | "ERROR" | "DISCONNECTED";
  lastSyncedAt: string | null;
  lastActivityAt: string | null;
  lastError: string | null;
};

export type GitHubRepositorySummary = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  url: string;
  defaultBranch: string;
  updatedAt: string;
  pushedAt: string | null;
  stargazers: number;
  forks: number;
  openIssues: number;
  language: string | null;
};

export type GitHubPageInfo = {
  page: number;
  perPage: number;
  hasNextPage: boolean;
  totalCount: number | null;
};

export type GitHubRepositoryListItem = GitHubRepositorySummary & {
  isConnected: boolean;
  mappingId: string | null;
};

export type GitHubPullRequestSummary = {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  repositoryFullName: string;
  updatedAt: string;
  createdAt: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
};

export type GitHubIssueSummary = {
  id: number;
  number: number;
  title: string;
  state: string;
  url: string;
  repositoryFullName: string;
  updatedAt: string;
  createdAt: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
};

export type GitHubCommitSummary = {
  sha: string;
  message: string;
  url: string;
  committedAt: string | null;
  authorName: string | null;
  repositoryFullName: string;
};

export type GitHubBranchSummary = {
  name: string;
  protected: boolean;
};

export type GitHubReleaseSummary = {
  id: number;
  name: string | null;
  tagName: string;
  url: string;
  publishedAt: string | null;
  isLatest: boolean;
};

export type GitHubDiscussionSummary = {
  id: string;
  number: number;
  title: string;
  url: string;
  updatedAt: string;
  answerChosen: boolean;
};

export type GitHubCommentSummary = {
  id: number;
  body: string | null;
  url: string;
  authorLogin: string | null;
  authorAvatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GitHubReviewSummary = {
  id: number;
  state: string;
  body: string | null;
  url: string;
  authorLogin: string | null;
  submittedAt: string | null;
};

export type GitHubIssueDetail = GitHubIssueSummary & {
  body: string | null;
  comments: GitHubCommentSummary[];
};

export type GitHubPullRequestDetail = GitHubPullRequestSummary & {
  body: string | null;
  draft: boolean;
  merged: boolean;
  baseBranch: string;
  headBranch: string;
  comments: GitHubCommentSummary[];
  reviews: GitHubReviewSummary[];
  commits: GitHubCommitSummary[];
};

export type GitHubRepositoryDetail = GitHubLinkedRepositoryData & {
  issues: GitHubIssueSummary[];
  pullRequests: GitHubPullRequestSummary[];
};

export type GitHubWorkspaceRepositoryDirectory = {
  items: GitHubRepositoryListItem[];
  pageInfo: GitHubPageInfo;
  query: string;
};

export type GitHubWorkspaceEntitySearchResult = {
  entityType:
    | "GITHUB_REPOSITORY"
    | "GITHUB_PULL_REQUEST"
    | "GITHUB_ISSUE"
    | "GITHUB_DISCUSSION"
    | "GITHUB_RELEASE"
    | "GITHUB_BRANCH"
    | "COMMIT";
  entityId: string;
  externalId: string;
  label: string;
  preview: string;
  repositoryFullName: string | null;
  url: string | null;
};

export type GitHubWorkspaceEntityDetail =
  | {
      entityType: "GITHUB_REPOSITORY";
      entityId: string;
      externalId: string;
      title: string;
      subtitle: string;
      url: string | null;
      repositoryFullName: string;
      repository: GitHubRepositoryDetail;
    }
  | {
      entityType: "GITHUB_PULL_REQUEST";
      entityId: string;
      externalId: string;
      title: string;
      subtitle: string;
      url: string | null;
      repositoryFullName: string;
      pullRequest: GitHubPullRequestDetail;
    }
  | {
      entityType: "GITHUB_ISSUE";
      entityId: string;
      externalId: string;
      title: string;
      subtitle: string;
      url: string | null;
      repositoryFullName: string;
      issue: GitHubIssueDetail;
    }
  | {
      entityType: "GITHUB_DISCUSSION" | "GITHUB_RELEASE" | "GITHUB_BRANCH";
      entityId: string;
      externalId: string;
      title: string;
      subtitle: string;
      url: string | null;
      repositoryFullName: string;
      metadata: Record<string, unknown>;
    }
  | {
      entityType: "COMMIT";
      entityId: string;
      externalId: string;
      title: string;
      subtitle: string;
      url: string | null;
      repositoryFullName: string;
      commit: GitHubCommitSummary;
    };

export type GitHubLinkedRepositoryData = {
  repository: GitHubRepositorySummary;
  branches: GitHubBranchSummary[];
  releases: GitHubReleaseSummary[];
  discussions: GitHubDiscussionSummary[];
  commits: GitHubCommitSummary[];
};

export type GitHubWorkspaceOverview = {
  account: GitHubAccountSummary;
  linkedRepository: {
    connected: boolean;
    fullName: string | null;
  };
  linkedRepositories: GitHubWorkspaceConnectionSummary[];
  repositories: GitHubRepositorySummary[];
  pullRequests: GitHubPullRequestSummary[];
  issues: GitHubIssueSummary[];
  linkedRepositoryData: GitHubLinkedRepositoryData | null;
  error: string | null;
};
