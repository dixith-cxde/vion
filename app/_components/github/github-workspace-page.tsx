"use client";

import Link from "next/link";
import { useState } from "react";
import {
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useGithubEntity } from "@/lib/hooks/use-github-entity";
import { useGithubWorkspace } from "@/lib/hooks/use-github-workspace";
import type {
  GitHubBranchSummary,
  GitHubCommitSummary,
  GitHubWorkspaceEntityDetail,
  GitHubDiscussionSummary,
  GitHubIssueSummary,
  GitHubPullRequestSummary,
  GitHubReleaseSummary,
  GitHubRepositorySummary,
  GitHubWorkspaceOverview,
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

function isGithubEntityType(value: string | undefined): value is GitHubWorkspaceEntityDetail["entityType"] {
  return [
    "GITHUB_REPOSITORY",
    "GITHUB_PULL_REQUEST",
    "GITHUB_ISSUE",
    "GITHUB_DISCUSSION",
    "GITHUB_RELEASE",
    "GITHUB_BRANCH",
    "COMMIT",
  ].includes(value ?? "");
}

function getGithubEntityHref(
  workspaceId: string,
  entityType:
    | "GITHUB_PULL_REQUEST"
    | "GITHUB_ISSUE"
    | "GITHUB_DISCUSSION"
    | "GITHUB_RELEASE"
    | "GITHUB_BRANCH",
  externalId: string,
) {
  const entityId = `github:${entityType.toLowerCase()}:${externalId.trim().toLowerCase()}`;
  return `/workspaces/${workspaceId}/github?entityType=${entityType}&entityId=${encodeURIComponent(entityId)}`;
}

export function GithubWorkspacePage({
  workspaceId,
  initialEntityType,
  initialEntityId,
}: {
  workspaceId: string;
  initialEntityType?: string;
  initialEntityId?: string;
}) {
  const {
    data,
    isLoading,
    isFetching,
    refetch,
    connectRepository,
    disconnectRepository,
    disconnectGithubAccount,
    isConnectingRepository,
    isDisconnectingRepository,
    isDisconnectingGithubAccount,
  } = useGithubWorkspace(workspaceId);
  const entityType = isGithubEntityType(initialEntityType) ? initialEntityType : null;
  const entityQuery = useGithubEntity(workspaceId, entityType, initialEntityId ?? null);
  const [repositoryInput, setRepositoryInput] = useState("");
  const [isLinkingAll, setIsLinkingAll] = useState(false);
  const linkedRepositoryName = data?.linkedRepository.fullName ?? "";
  const linkedRepositoryNames = new Set(
    (data?.linkedRepositories ?? []).map((repository) => repository.repositoryFullName),
  );

  function handleGithubConnect() {
    const returnTo = `/workspaces/${workspaceId}/github`;
    window.location.assign(
      `/api/github/connect?workspaceId=${encodeURIComponent(workspaceId)}&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  async function handleConnectRepository(nextRepository?: string) {
    const repositoryFullName = (nextRepository ?? repositoryInput).trim();

    if (!repositoryFullName) {
      toast({
        title: "Repository required",
        description: "Use the owner/repo format.",
        variant: "destructive",
      });
      return;
    }

    try {
      await connectRepository(repositoryFullName);
      setRepositoryInput("");
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

  async function handleDisconnectRepository(repositoryFullName?: string) {
    try {
      await disconnectRepository(repositoryFullName);
      toast({
        title: "Workspace repository disconnected",
        description: repositoryFullName ?? linkedRepositoryName,
      });
    } catch {
      toast({
        title: "Unable to disconnect repository",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  }

  async function handleDisconnectGithub() {
    try {
      await disconnectGithubAccount();
      toast({
        title: "GitHub disconnected",
        description: "Repository runtime access has been removed.",
      });
    } catch {
      toast({
        title: "Unable to disconnect GitHub",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  }

  async function handleLinkAllRepositories() {
    if (!data) {
      return;
    }

    const repositoriesToLink = data.repositories.filter(
      (repository) => !linkedRepositoryNames.has(repository.fullName),
    );

    if (repositoriesToLink.length === 0 || isLinkingAll) {
      toast({
        title: "Repositories already linked",
        description: "All available repositories are already connected to this workspace.",
      });
      return;
    }

    setIsLinkingAll(true);

    try {
      for (const repository of repositoriesToLink) {
        await connectRepository(repository.fullName);
      }

      if (linkedRepositoryName) {
        await connectRepository(linkedRepositoryName);
      }

      toast({
        title: "Repositories linked",
        description: `${repositoriesToLink.length} repositories connected to this workspace.`,
      });
    } catch {
      toast({
        title: "Unable to link all repositories",
        description: "Some repositories could not be linked. Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsLinkingAll(false);
    }
  }

  if (isLoading || !data) {
    return <GithubWorkspaceSkeleton />;
  }

  const linkedRepositoryData = data.linkedRepositoryData;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      <div className="border-b px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">GitHub</h1>
            <p className="text-sm text-muted-foreground">
              Repository context, active work, and linked code surfaces for this workspace.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleGithubConnect}>
              <FolderGit2 className="size-3.5" />
              {data.account.connected ? "Reconnect GitHub" : "Connect GitHub"}
            </Button>
            {data.account.connected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDisconnectGithub()}
                disabled={isDisconnectingGithubAccount}
              >
                {isDisconnectingGithubAccount ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                Disconnect
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="size-3.5" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {!data.account.connected ? (
          <section className="max-w-3xl space-y-5 border-l border-violet-200 pl-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
                <FolderGit2 className="size-4" />
                Connect GitHub
              </div>
              <p className="text-sm leading-7 text-slate-600">
                Connect a dedicated GitHub repository integration for private repositories,
                organization access, pull requests, issues, commits, discussions, releases, and
                branches.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Clerk remains the platform identity layer only. GitHub repository access is handled
              through a separate OAuth runtime integration.
            </p>
            <Button onClick={handleGithubConnect} className="rounded-lg bg-violet-600 hover:bg-violet-700">
              <FolderGit2 className="size-4" />
              Connect GitHub runtime
            </Button>
          </section>
        ) : (
          <div className="space-y-5">
            {!data.account.accessTokenAvailable ? (
              <section className="space-y-4 border-l border-amber-200 pl-5">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                    <FolderGit2 className="size-4" />
                    GitHub runtime needs attention
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    The GitHub integration exists, but VION needs a valid repository runtime token
                    before collaborative repository features can continue.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {data.account.authError ??
                    "Reconnect GitHub to restore repository access, workspace sync, entity resolution, and collaborative propagation."}
                </p>
                <Button onClick={handleGithubConnect} className="rounded-lg bg-amber-500 text-white hover:bg-amber-600">
                  <FolderGit2 className="size-4" />
                  Reconnect GitHub
                </Button>
              </section>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={FolderGit2}
                label="Account"
                value={data.account.username ?? "GitHub"}
                detail={data.account.connectedAt ? `Connected ${formatRelativeDate(data.account.connectedAt)}` : "Runtime connected"}
              />
              <MetricCard
                icon={FolderGit2}
                label="Repositories"
                value={String(data.repositories.length)}
                detail="Available to this GitHub account"
              />
              <MetricCard
                icon={GitPullRequest}
                label="Pull requests"
                value={String(data.pullRequests.length)}
                detail="Current review surface"
              />
              <MetricCard
                icon={Link2}
                label="Linked"
                value={String(data.linkedRepositories.length)}
                detail={data.linkedRepository.fullName ?? "No primary repository yet"}
              />
            </div>

            {data.error ? (
              <div className="border-l border-destructive/30 pl-4 text-sm text-muted-foreground">
                {data.error}
              </div>
            ) : null}

            {entityType && initialEntityId ? (
              <section className="space-y-4 border-t border-border/60 pt-5">
                <div>
                  <h2 className="text-base font-semibold tracking-tight text-slate-900">
                    Selected entity
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    GitHub entities resolve here as native workspace-linked references.
                  </p>
                </div>
                <div>
                  {entityQuery.isLoading ? (
                    <Skeleton className="h-48 rounded-lg" />
                  ) : entityQuery.error ? (
                    <div className="text-sm text-destructive">
                      {entityQuery.error instanceof Error
                        ? entityQuery.error.message
                        : "Failed to load entity."}
                    </div>
                  ) : entityQuery.data ? (
                    <GithubEntityDetailCard detail={entityQuery.data} workspaceId={workspaceId} />
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="space-y-4 border-t border-border/60 pt-5">
              <div className="space-y-1">
                <h2 className="text-base font-semibold tracking-tight text-slate-900">
                  Repository linking
                </h2>
                <p className="text-sm text-muted-foreground">
                  Link repositories into the workspace so documents, tasks, mentions, and graph
                  relationships share the same code context.
                </p>
              </div>
                <div className="flex flex-col gap-2 xl:flex-row">
                  <Input
                    value={repositoryInput}
                    onChange={(event) => setRepositoryInput(event.target.value)}
                    placeholder={linkedRepositoryName || "owner/repo"}
                    className="h-10 rounded-lg border-0 bg-slate-100/80 ring-1 ring-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-violet-300"
                  />
                  <Button
                    onClick={() => void handleConnectRepository()}
                    disabled={isConnectingRepository}
                    className="h-10 rounded-lg bg-violet-600 hover:bg-violet-700"
                  >
                    {isConnectingRepository ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Link2 className="size-4" />
                    )}
                    Link repository
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => void handleLinkAllRepositories()}
                    disabled={isLinkingAll || isConnectingRepository || data.repositories.length === 0}
                    className="h-10 rounded-lg border-0 bg-sky-100/80 text-sky-700 shadow-none hover:bg-sky-200/80 hover:text-sky-800"
                  >
                    {isLinkingAll ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <FolderGit2 className="size-4" />
                    )}
                    Link all repositories
                  </Button>
                </div>

                <div className="rounded-lg bg-emerald-50/80 px-4 py-2 text-sm text-muted-foreground">
                  Primary repository: {data.linkedRepository.fullName ?? "Not set"}
                </div>

                {data.linkedRepositories.length ? (
                  <div className="rounded-lg bg-slate-100/85 p-3">
                    <ScrollArea className="h-[240px] pr-3">
                      <div className="space-y-2">
                        {data.linkedRepositories.map((connection) => (
                          <LinkedRepositoryCard
                            key={connection.id}
                            workspaceId={workspaceId}
                            connection={connection}
                            isDisconnectingRepository={isDisconnectingRepository}
                            onDisconnect={() => void handleDisconnectRepository(connection.repositoryFullName)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : null}

                {data.error ? (
                  <div className="border-l border-destructive/30 pl-4 text-sm text-destructive">
                    {data.error}
                  </div>
                ) : null}
            </section>

            <Tabs defaultValue="overview" className="gap-4">
              <TabsList variant="line">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="repositories">Repositories</TabsTrigger>
                <TabsTrigger value="pull-requests">Pull requests</TabsTrigger>
                <TabsTrigger value="issues">Issues</TabsTrigger>
                <TabsTrigger value="linked-repo">Primary repo</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <EntityCard
                    title="Active pull requests"
                    description="Recently updated PRs across the connected account."
                    emptyMessage="No pull requests found."
                    scrollHeightClassName="h-[320px]"
                  >
                    {data.pullRequests.map((pullRequest) => (
                      <PullRequestRow
                        key={`${pullRequest.repositoryFullName}-${pullRequest.number}`}
                        workspaceId={workspaceId}
                        pullRequest={pullRequest}
                      />
                    ))}
                  </EntityCard>

                  <EntityCard
                    title="Active issues"
                    description="Recently updated issues across the connected account."
                    emptyMessage="No issues found."
                    scrollHeightClassName="h-[320px]"
                  >
                    {data.issues.map((issue) => (
                      <IssueRow
                        key={`${issue.repositoryFullName}-${issue.number}`}
                        workspaceId={workspaceId}
                        issue={issue}
                      />
                    ))}
                  </EntityCard>
                </div>

                <EntityCard
                  title="Linked repository activity"
                  description={
                    data.linkedRepositoryData?.repository.fullName
                      ? data.linkedRepositoryData.repository.fullName
                      : "Connect a repository to see branches, releases, discussions, and commits."
                  }
                  emptyMessage="No linked repository activity yet."
                  scrollHeightClassName="h-[360px]"
                >
                  {data.linkedRepositoryData?.commits.map((commit) => (
                    <CommitRow key={commit.sha} commit={commit} />
                  )) ?? []}
                </EntityCard>
              </TabsContent>

              <TabsContent value="repositories" className="space-y-4">
                <section className="space-y-4 border-t border-border/60 pt-5">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-slate-900">
                      Repositories
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Available repositories from the connected GitHub account.
                    </p>
                  </div>
                    {data.repositories.length > 0 ? (
                      <div className="rounded-lg bg-slate-100/85 p-3">
                        <ScrollArea className="h-[460px] pr-3">
                          <div className="space-y-2">
                            {data.repositories.map((repository) => (
                              <RepositoryRow
                                key={repository.id}
                                workspaceId={workspaceId}
                                repository={repository}
                                isLinked={linkedRepositoryNames.has(repository.fullName)}
                                onLink={() => void handleConnectRepository(repository.fullName)}
                              />
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No repositories available.</div>
                    )}
                </section>
              </TabsContent>

              <TabsContent value="pull-requests">
                <EntityCard
                  title="Pull requests"
                  description="GitHub pull request activity resolved from the signed-in user."
                  emptyMessage="No pull requests found."
                  scrollHeightClassName="h-[520px]"
                >
                    {data.pullRequests.map((pullRequest) => (
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
                  description="GitHub issue activity resolved from the signed-in user."
                  emptyMessage="No issues found."
                  scrollHeightClassName="h-[520px]"
                >
                    {data.issues.map((issue) => (
                      <IssueRow
                        key={`${issue.repositoryFullName}-${issue.number}`}
                        workspaceId={workspaceId}
                        issue={issue}
                      />
                  ))}
                </EntityCard>
              </TabsContent>

              <TabsContent value="linked-repo" className="space-y-4">
                {linkedRepositoryData ? (
                  <>
                    <EntityCard
                      title="Branches"
                      description="Current branch set from the workspace-linked repository."
                      emptyMessage="No branches found."
                      scrollHeightClassName="h-[280px]"
                    >
                      {linkedRepositoryData.branches.map((branch) => (
                        <BranchRow key={branch.name} branch={branch} />
                      ))}
                    </EntityCard>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <EntityCard
                        title="Releases"
                        description="Published releases from the linked repository."
                        emptyMessage="No releases found."
                        scrollHeightClassName="h-[280px]"
                      >
                        {linkedRepositoryData.releases.map((release) => (
                          <ReleaseRow
                            key={release.id}
                            workspaceId={workspaceId}
                            repositoryFullName={linkedRepositoryData.repository.fullName}
                            release={release}
                          />
                        ))}
                      </EntityCard>

                      <EntityCard
                        title="Discussions"
                        description="Recent repository discussions."
                        emptyMessage="No discussions found."
                        scrollHeightClassName="h-[280px]"
                      >
                        {linkedRepositoryData.discussions.map((discussion) => (
                          <DiscussionRow
                            key={discussion.id}
                            workspaceId={workspaceId}
                            repositoryFullName={linkedRepositoryData.repository.fullName}
                            discussion={discussion}
                          />
                        ))}
                      </EntityCard>
                    </div>

                    <EntityCard
                      title="Recent commits"
                      description="Fresh commit flow from the linked repository."
                      emptyMessage="No commits found."
                      scrollHeightClassName="h-[360px]"
                    >
                      {linkedRepositoryData.commits.map((commit) => (
                        <CommitRow key={commit.sha} commit={commit} />
                      ))}
                    </EntityCard>
                  </>
                ) : (
                  <div className="flex min-h-52 items-center justify-center border-t border-border/60 px-6 py-8 text-sm text-muted-foreground">
                      Link a repository to bring branches, releases, discussions, and
                      recent commits into the workspace surface.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function GithubWorkspaceSkeleton() {
  return (
    <div className="space-y-5 px-6 py-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
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
    <div className="border-l border-slate-200 pl-4">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-2 truncate text-base font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</div>
    </div>
  );
}

function LinkedRepositoryCard({
  workspaceId,
  connection,
  isDisconnectingRepository,
  onDisconnect,
}: {
  workspaceId: string;
  connection: GitHubWorkspaceOverview["linkedRepositories"][number];
  isDisconnectingRepository: boolean;
  onDisconnect: () => void;
}) {
  return (
    <div className="rounded-lg bg-white/75 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold text-foreground">
              {connection.repositoryFullName}
            </div>
            {connection.isPrimary ? (
              <Badge variant="secondary" className="rounded-md bg-emerald-50 px-2 py-0 text-[10px] text-emerald-700">
                Primary
              </Badge>
            ) : null}
            {connection.isPrivate ? (
              <Badge variant="outline" className="rounded-md border-slate-200 bg-white/70 px-2 py-0 text-[10px]">
                Private
              </Badge>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {connection.repositoryOwner} / {connection.repositoryName}
          </div>
          <div className="text-xs text-muted-foreground">
            {connection.syncStatus.toLowerCase()} · synced {formatRelativeDate(connection.lastSyncedAt)}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 rounded-lg border-0 bg-slate-200/80 px-3 shadow-none hover:bg-slate-300/80">
            <Link href={`/workspaces/${workspaceId}/github/repositories/${connection.repositoryFullName}`}>
              <FolderGit2 className="size-3.5" />
              Open
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={onDisconnect} disabled={isDisconnectingRepository} className="h-8 rounded-lg border-0 bg-rose-100/80 px-3 text-rose-700 shadow-none hover:bg-rose-200/80 hover:text-rose-800">
            {isDisconnectingRepository ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Link2 className="size-3.5" />
            )}
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
}

function EntityCard({
  title,
  description,
  emptyMessage,
  children,
  scrollHeightClassName = "h-[360px]",
}: {
  title: string;
  description: string;
  emptyMessage: string;
  children: React.ReactNode;
  scrollHeightClassName?: string;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);

  return (
    <section className="space-y-4 rounded-lg bg-slate-100/85 p-4">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {items.length > 0 ? (
        <ScrollArea className={`${scrollHeightClassName} pr-3`}>
          <div className="space-y-2">{items}</div>
        </ScrollArea>
      ) : (
        <div className="py-4 text-sm text-muted-foreground">{emptyMessage}</div>
      )}
    </section>
  );
}

function GithubEntityDetailCard({
  detail,
  workspaceId,
}: {
  detail: GitHubWorkspaceEntityDetail;
  workspaceId: string;
}) {
  if (detail.entityType === "GITHUB_REPOSITORY") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-semibold">{detail.title}</div>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
            Repository
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">{detail.subtitle}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspaces/${workspaceId}/github/repositories/${detail.repositoryFullName}`}>
              <FolderGit2 className="size-3.5" />
              Open repository
            </Link>
          </Button>
          {detail.url ? (
            <Button variant="outline" size="sm" asChild>
              <a href={detail.url} target="_blank" rel="noreferrer">
                <ArrowUpRight className="size-3.5" />
                Open on GitHub
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (detail.entityType === "GITHUB_PULL_REQUEST") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-semibold">{detail.pullRequest.title}</div>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
            PR #{detail.pullRequest.number}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {detail.repositoryFullName} • {detail.pullRequest.state} • {detail.pullRequest.baseBranch} ←{" "}
          {detail.pullRequest.headBranch}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <EntityCard title="Reviews" description="Review decisions and feedback." emptyMessage="No reviews yet.">
            {detail.pullRequest.reviews.map((review) => (
              <div key={review.id} className="px-6 py-4 text-sm">
                <div className="font-medium">{review.authorLogin ?? "Unknown reviewer"}</div>
                <div className="mt-1 text-muted-foreground">{review.state}</div>
              </div>
            ))}
          </EntityCard>
          <EntityCard title="Commits" description="Commits attached to this pull request." emptyMessage="No commits found.">
            {detail.pullRequest.commits.map((commit) => (
              <CommitRow key={commit.sha} commit={commit} />
            ))}
          </EntityCard>
        </div>
        <EntityCard title="Comments" description="Conversation attached to this pull request." emptyMessage="No comments yet.">
          {detail.pullRequest.comments.map((comment) => (
            <div key={comment.id} className="px-6 py-4 text-sm">
              <div className="font-medium">{comment.authorLogin ?? "Unknown author"}</div>
              <div className="mt-1 text-muted-foreground line-clamp-4">{comment.body ?? "No comment body"}</div>
            </div>
          ))}
        </EntityCard>
      </div>
    );
  }

  if (detail.entityType === "GITHUB_ISSUE") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-base font-semibold">{detail.issue.title}</div>
          <Badge variant="outline" className="rounded-md px-2 py-0 text-[10px]">
            Issue #{detail.issue.number}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {detail.repositoryFullName} • {detail.issue.state}
        </div>
        <EntityCard title="Comments" description="Discussion on this issue." emptyMessage="No comments yet.">
          {detail.issue.comments.map((comment) => (
            <div key={comment.id} className="px-6 py-4 text-sm">
              <div className="font-medium">{comment.authorLogin ?? "Unknown author"}</div>
              <div className="mt-1 text-muted-foreground line-clamp-4">{comment.body ?? "No comment body"}</div>
            </div>
          ))}
        </EntityCard>
      </div>
    );
  }

  if (detail.entityType === "COMMIT") {
    return (
      <div className="space-y-3">
        <div className="text-base font-semibold">{detail.commit.message}</div>
        <div className="text-sm text-muted-foreground">
          {detail.repositoryFullName} • {detail.commit.sha}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-base font-semibold">{detail.title}</div>
      <div className="text-sm text-muted-foreground">{detail.subtitle}</div>
      {detail.url ? (
        <Button variant="outline" size="sm" asChild>
          <a href={detail.url} target="_blank" rel="noreferrer">
            <ArrowUpRight className="size-3.5" />
            Open on GitHub
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function RepositoryRow({
  workspaceId,
  repository,
  isLinked,
  onLink,
}: {
  workspaceId: string;
  repository: GitHubRepositorySummary;
  isLinked: boolean;
  onLink: () => void;
}) {
  return (
    <div className="rounded-lg bg-white/75 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="truncate text-sm font-semibold text-foreground">{repository.fullName}</div>
            {isLinked ? (
              <Badge variant="secondary" className="rounded-md bg-violet-50 px-2 py-0 text-[10px] text-violet-700">
                Linked
              </Badge>
            ) : null}
            {repository.private ? (
              <Badge variant="outline" className="rounded-md border-slate-200 bg-white/70 px-2 py-0 text-[10px]">
                Private
              </Badge>
            ) : null}
          </div>
          <div className="line-clamp-1 text-sm text-muted-foreground">
            {repository.description ?? "No description"}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{repository.language ?? "Unspecified"}</span>
            <span>Updated {formatRelativeDate(repository.updatedAt)}</span>
            <span>{repository.stargazers} stars</span>
            <span>{repository.forks} forks</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8 rounded-lg border-0 bg-slate-200/80 px-3 shadow-none hover:bg-slate-300/80">
            <Link href={`/workspaces/${workspaceId}/github/repositories/${repository.fullName}`}>
              <FolderGit2 className="size-3.5" />
              Details
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="h-8 rounded-lg border-0 bg-sky-100/80 px-3 text-sky-700 shadow-none hover:bg-sky-200/80 hover:text-sky-800">
            <a href={repository.url} target="_blank" rel="noreferrer">
              <ArrowUpRight className="size-3.5" />
              Open
            </a>
          </Button>
          {!isLinked ? (
            <Button size="sm" onClick={onLink} className="h-8 rounded-lg bg-violet-600 px-3 hover:bg-violet-700">
              <Link2 className="size-3.5" />
              Link
            </Button>
          ) : null}
        </div>
      </div>
    </div>
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
          {discussion.answerChosen ? " • answered" : ""}
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
