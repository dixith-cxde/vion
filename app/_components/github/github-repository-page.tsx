"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Link2,
  LoaderCircle,
  MessageSquare,
  RefreshCcw,
  Tags,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useGithubRepository } from "@/lib/hooks/use-github-repository";
import { useGithubWorkspace } from "@/lib/hooks/use-github-workspace";
import type {
  GitHubBranchSummary,
  GitHubCommitSummary,
  GitHubDiscussionSummary,
  GitHubIssueSummary,
  GitHubPullRequestSummary,
  GitHubReleaseSummary,
} from "@/lib/types/github";

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(value).getTime();
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function getGithubEntityHref(
  workspaceId: string,
  entityType:
    | "GITHUB_PULL_REQUEST"
    | "GITHUB_ISSUE"
    | "GITHUB_DISCUSSION"
    | "GITHUB_RELEASE",
  externalId: string,
) {
  const entityId = `github:${entityType.toLowerCase()}:${externalId.trim().toLowerCase()}`;
  return `/workspaces/${workspaceId}/github?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`;
}

export function GithubRepositoryPage({
  workspaceId,
  repositoryFullName,
}: {
  workspaceId: string;
  repositoryFullName: string;
}) {
  const repositoryQuery = useGithubRepository(workspaceId, repositoryFullName);
  const workspaceGithub = useGithubWorkspace(workspaceId);

  const linkedRepositoryFullName =
    workspaceGithub.data?.linkedRepository.fullName ?? null;
  const isLinked = linkedRepositoryFullName === repositoryFullName;

  async function handleLinkRepository() {
    try {
      await workspaceGithub.connectRepository(repositoryFullName);
      toast({
        title: "Workspace repository connected",
        description: repositoryFullName,
      });
    } catch {
      toast({
        title: "Unable to connect repository",
        description: "Check the repository name and try again.",
        variant: "destructive",
      });
    }
  }

  async function handleDisconnectRepository() {
    try {
      await workspaceGithub.disconnectRepository(repositoryFullName);
      toast({
        title: "Workspace repository disconnected",
        description: repositoryFullName,
      });
    } catch {
      toast({
        title: "Unable to disconnect repository",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  }

  if (repositoryQuery.isLoading || !repositoryQuery.data) {
    return <GithubRepositorySkeleton />;
  }

  if (repositoryQuery.error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
        <div className="border-b px-6 py-5">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/github`}>
                <ArrowLeft className="size-3.5" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">GitHub</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Repository details could not be loaded.
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <Card className="rounded-2xl border shadow-none">
            <CardContent className="px-6 py-8 text-sm text-destructive">
              {repositoryQuery.error instanceof Error
                ? repositoryQuery.error.message
                : "Failed to load repository details."}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { repository } = repositoryQuery.data;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden">
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspaces/${workspaceId}/github`}>
                <ArrowLeft className="size-3.5" />
                Back to GitHub
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {repository.repository.fullName}
                </h1>
                {isLinked ? (
                  <Badge variant="secondary" className="rounded-md px-2 py-0 text-[10px]">
                    Linked
                  </Badge>
                ) : null}
                {repository.repository.private ? (
                  <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
                    Private
                  </Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {repository.repository.description ?? "GitHub repository details inside your workspace."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void repositoryQuery.refetch()}
              disabled={repositoryQuery.isFetching}
            >
              {repositoryQuery.isFetching ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="size-3.5" />
              )}
              Refresh
            </Button>
            {!isLinked ? (
              <Button
                size="sm"
                onClick={() => void handleLinkRepository()}
                disabled={workspaceGithub.isConnectingRepository}
              >
                {workspaceGithub.isConnectingRepository ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                Use in workspace
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDisconnectRepository()}
                disabled={workspaceGithub.isDisconnectingRepository}
              >
                {workspaceGithub.isDisconnectingRepository ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                Disconnect
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a
                href={repository.repository.url}
                target="_blank"
                rel="noreferrer"
              >
                <ArrowUpRight className="size-3.5" />
                Open on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={FolderGit2}
              label="Repository"
              value={repository.repository.name}
              detail={repository.repository.language ?? "Unspecified language"}
            />
            <MetricCard
              icon={GitPullRequest}
              label="Pull requests"
              value={String(repository.pullRequests.length)}
              detail="Recently updated pull requests"
            />
            <MetricCard
              icon={MessageSquare}
              label="Issues"
              value={String(repository.issues.length)}
              detail="Recently updated issues"
            />
            <MetricCard
              icon={GitCommitHorizontal}
              label="Commits"
              value={String(repository.commits.length)}
              detail={`updated ${formatRelativeDate(repository.repository.updatedAt)}`}
            />
          </div>

          <Card className="rounded-2xl border shadow-none">
            <CardHeader className="border-b">
              <CardTitle className="text-base font-semibold tracking-tight">
                Repository context
              </CardTitle>
              <CardDescription>
                Default branch, open issues, stars, forks, and collaborative workspace linkage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="rounded-md px-2 py-0">
                  {repository.repository.defaultBranch}
                </Badge>
                <Badge variant="outline" className="rounded-md px-2 py-0">
                  {repository.repository.stargazers} stars
                </Badge>
                <Badge variant="outline" className="rounded-md px-2 py-0">
                  {repository.repository.forks} forks
                </Badge>
                <Badge variant="outline" className="rounded-md px-2 py-0">
                  {repository.repository.openIssues} open issues
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                {repository.repository.description ?? "No repository description available."}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="overview" className="gap-4">
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pull-requests">Pull requests</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="commits">Commits</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-2">
                <EntityCard
                  title="Branches"
                  description="Current branches from this repository."
                  emptyMessage="No branches found."
                >
                  {repository.branches.map((branch) => (
                    <BranchRow key={branch.name} branch={branch} />
                  ))}
                </EntityCard>

                <EntityCard
                  title="Releases"
                  description="Published releases from this repository."
                  emptyMessage="No releases found."
                >
                  {repository.releases.map((release) => (
                    <ReleaseRow
                      key={release.id}
                      workspaceId={workspaceId}
                      repositoryFullName={repository.repository.fullName}
                      release={release}
                    />
                  ))}
                </EntityCard>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <EntityCard
                  title="Recent pull requests"
                  description="Recently updated pull requests."
                  emptyMessage="No pull requests found."
                >
                  {repository.pullRequests.map((pullRequest) => (
                    <PullRequestRow
                      key={`${pullRequest.repositoryFullName}-${pullRequest.number}`}
                      workspaceId={workspaceId}
                      pullRequest={pullRequest}
                    />
                  ))}
                </EntityCard>

                <EntityCard
                  title="Recent issues"
                  description="Recently updated issues."
                  emptyMessage="No issues found."
                >
                  {repository.issues.map((issue) => (
                    <IssueRow
                      key={`${issue.repositoryFullName}-${issue.number}`}
                      workspaceId={workspaceId}
                      issue={issue}
                    />
                  ))}
                </EntityCard>
              </div>

              <EntityCard
                title="Discussions"
                description="Recent repository discussions."
                emptyMessage="No discussions found."
              >
                {repository.discussions.map((discussion) => (
                  <DiscussionRow
                    key={discussion.id}
                    workspaceId={workspaceId}
                    repositoryFullName={repository.repository.fullName}
                    discussion={discussion}
                  />
                ))}
              </EntityCard>
            </TabsContent>

            <TabsContent value="pull-requests">
              <EntityCard
                title="Pull requests"
                description="Current pull request activity for this repository."
                emptyMessage="No pull requests found."
              >
                {repository.pullRequests.map((pullRequest) => (
                  <PullRequestRow
                    key={`${pullRequest.repositoryFullName}-${pullRequest.number}`}
                    workspaceId={workspaceId}
                    pullRequest={pullRequest}
                  />
                ))}
              </EntityCard>
            </TabsContent>

            <TabsContent value="issues">
              <EntityCard
                title="Issues"
                description="Current issue activity for this repository."
                emptyMessage="No issues found."
              >
                {repository.issues.map((issue) => (
                  <IssueRow
                    key={`${issue.repositoryFullName}-${issue.number}`}
                    workspaceId={workspaceId}
                    issue={issue}
                  />
                ))}
              </EntityCard>
            </TabsContent>

            <TabsContent value="commits">
              <EntityCard
                title="Recent commits"
                description="Fresh commit flow from this repository."
                emptyMessage="No commits found."
              >
                {repository.commits.map((commit) => (
                  <CommitRow key={commit.sha} commit={commit} />
                ))}
              </EntityCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function GithubRepositorySkeleton() {
  return (
    <div className="space-y-5 px-6 py-5">
      <Skeleton className="h-24 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof FolderGit2;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-2xl border shadow-none">
      <CardContent className="space-y-3 px-5 py-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className="truncate text-lg font-semibold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

function EntityCard({
  title,
  description,
  emptyMessage,
  children,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children)
    ? children.filter(Boolean)
    : [children].filter(Boolean);

  return (
    <Card className="rounded-2xl border shadow-none">
      <CardHeader className="border-b">
        <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {items.length > 0 ? (
          <div className="divide-y">{items}</div>
        ) : (
          <div className="px-6 py-8 text-sm text-muted-foreground">{emptyMessage}</div>
        )}
      </CardContent>
    </Card>
  );
}

function PullRequestRow({
  workspaceId,
  pullRequest,
}: {
  workspaceId: string;
  pullRequest: GitHubPullRequestSummary;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <GitPullRequest className="size-4 text-muted-foreground" />
          <div className="truncate font-medium">{pullRequest.title}</div>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
            #{pullRequest.number}
          </Badge>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {pullRequest.repositoryFullName} • {pullRequest.state} • updated{" "}
          {formatRelativeDate(pullRequest.updatedAt)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link
            href={getGithubEntityHref(
              workspaceId,
              "GITHUB_PULL_REQUEST",
              `${pullRequest.repositoryFullName}#${pullRequest.number}`,
            )}
          >
            <FolderGit2 className="size-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm" asChild>
          <a href={pullRequest.url} target="_blank" rel="noreferrer" aria-label="Open pull request">
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function IssueRow({
  workspaceId,
  issue,
}: {
  workspaceId: string;
  issue: GitHubIssueSummary;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <div className="truncate font-medium">{issue.title}</div>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
            #{issue.number}
          </Badge>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {issue.repositoryFullName} • {issue.state} • updated{" "}
          {formatRelativeDate(issue.updatedAt)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link
            href={getGithubEntityHref(
              workspaceId,
              "GITHUB_ISSUE",
              `${issue.repositoryFullName}#${issue.number}`,
            )}
          >
            <FolderGit2 className="size-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm" asChild>
          <a href={issue.url} target="_blank" rel="noreferrer" aria-label="Open issue">
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function CommitRow({ commit }: { commit: GitHubCommitSummary }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <GitCommitHorizontal className="size-4 text-muted-foreground" />
          <div className="truncate font-medium">{commit.message}</div>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
            {commit.sha.slice(0, 7)}
          </Badge>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {commit.repositoryFullName} • {commit.authorName ?? "Unknown author"} •{" "}
          {formatRelativeDate(commit.committedAt)}
        </div>
      </div>
      <Button variant="ghost" size="icon-sm" asChild>
        <a href={commit.url} target="_blank" rel="noreferrer" aria-label="Open commit">
          <ArrowUpRight className="size-4" />
        </a>
      </Button>
    </div>
  );
}

function BranchRow({ branch }: { branch: GitHubBranchSummary }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex items-center gap-2">
        <GitBranch className="size-4 text-muted-foreground" />
        <span className="font-medium">{branch.name}</span>
      </div>
      {branch.protected ? (
        <Badge variant="secondary" className="rounded-md px-2 py-0 text-[10px]">
          Protected
        </Badge>
      ) : (
        <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
          Branch
        </Badge>
      )}
    </div>
  );
}

function ReleaseRow({
  workspaceId,
  repositoryFullName,
  release,
}: {
  workspaceId: string;
  repositoryFullName: string;
  release: GitHubReleaseSummary;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Tags className="size-4 text-muted-foreground" />
          <div className="truncate font-medium">{release.name ?? release.tagName}</div>
          {release.isLatest ? (
            <Badge variant="secondary" className="rounded-md px-2 py-0 text-[10px]">
              Latest
            </Badge>
          ) : null}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {release.tagName} • published {formatRelativeDate(release.publishedAt)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link
            href={getGithubEntityHref(
              workspaceId,
              "GITHUB_RELEASE",
              `${repositoryFullName}@${release.tagName}`,
            )}
          >
            <FolderGit2 className="size-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm" asChild>
          <a href={release.url} target="_blank" rel="noreferrer" aria-label="Open release">
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}

function DiscussionRow({
  workspaceId,
  repositoryFullName,
  discussion,
}: {
  workspaceId: string;
  repositoryFullName: string;
  discussion: GitHubDiscussionSummary;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4 text-muted-foreground" />
          <div className="truncate font-medium">{discussion.title}</div>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
            #{discussion.number}
          </Badge>
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          updated {formatRelativeDate(discussion.updatedAt)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link
            href={getGithubEntityHref(
              workspaceId,
              "GITHUB_DISCUSSION",
              `${repositoryFullName}#${discussion.number}`,
            )}
          >
            <FolderGit2 className="size-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon-sm" asChild>
          <a href={discussion.url} target="_blank" rel="noreferrer" aria-label="Open discussion">
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
