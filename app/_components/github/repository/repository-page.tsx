"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  FolderGit2,
  GitCommitHorizontal,
  GitPullRequest,
  Link2,
  LoaderCircle,
  MessageSquare,
  RefreshCcw,
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
import { toast } from "@/hooks/use-toast";
import { useGithubRepository } from "@/lib/hooks/use-github-repository";
import { useGithubWorkspace } from "@/lib/hooks/use-github-workspace";
import { formatRelativeDate } from "../shared/github-format";
import { MetricCard, RepositoryTabs } from "./repository-cards";
import { GithubRepositorySkeleton } from "./repository-skeleton";

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

          <RepositoryTabs workspaceId={workspaceId} repository={repository} />
        </div>
      </div>
    </div>
  );
}
