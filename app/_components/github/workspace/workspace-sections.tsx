"use client";

import {
  FolderGit2,
  GitPullRequest,
  Link2,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useGithubEntity } from "@/lib/hooks/use-github-entity";
import { formatRelativeDate } from "../shared/github-format";
import {
  GithubEntityDetailCard,
  LinkedRepositoryCard,
  MetricCard,
} from "./workspace-cards";
import type {
  GitHubWorkspaceEntityDetail,
  GitHubWorkspaceOverview,
} from "@/lib/types/github";

export function WorkspaceConnectPrompt({ onGithubConnect }: { onGithubConnect: () => void }) {
  return (
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
      <Button onClick={onGithubConnect} className="rounded-lg bg-violet-600 hover:bg-violet-700">
        <FolderGit2 className="size-4" />
        Connect GitHub runtime
      </Button>
    </section>
  );
}

export function WorkspaceRuntimeAttention({
  data,
  onGithubConnect,
}: {
  data: GitHubWorkspaceOverview;
  onGithubConnect: () => void;
}) {
  return (
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
      <Button onClick={onGithubConnect} className="rounded-lg bg-amber-500 text-white hover:bg-amber-600">
        <FolderGit2 className="size-4" />
        Reconnect GitHub
      </Button>
    </section>
  );
}

export function WorkspaceMetrics({ data }: { data: GitHubWorkspaceOverview }) {
  return (
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
  );
}

export function WorkspaceEntitySection({
  workspaceId,
  entityType,
  entityId,
}: {
  workspaceId: string;
  entityType: GitHubWorkspaceEntityDetail["entityType"] | null;
  entityId: string | null;
}) {
  const entityQuery = useGithubEntity(workspaceId, entityType, entityId);

  if (!entityType || !entityId) {
    return null;
  }

  return (
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
  );
}

export function WorkspaceLinkingSection({
  workspaceId,
  data,
  repositoryInput,
  linkedRepositoryName,
  isConnectingRepository,
  isLinkingAll,
  isDisconnectingRepository,
  onRepositoryInputChange,
  onConnectRepository,
  onLinkAllRepositories,
  onDisconnectRepository,
}: {
  workspaceId: string;
  data: GitHubWorkspaceOverview;
  repositoryInput: string;
  linkedRepositoryName: string;
  isConnectingRepository: boolean;
  isLinkingAll: boolean;
  isDisconnectingRepository: boolean;
  onRepositoryInputChange: (value: string) => void;
  onConnectRepository: (repositoryFullName?: string) => void;
  onLinkAllRepositories: () => void;
  onDisconnectRepository: (repositoryFullName?: string) => void;
}) {
  return (
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
            onChange={(event) => onRepositoryInputChange(event.target.value)}
            placeholder={linkedRepositoryName || "owner/repo"}
            className="h-10 rounded-lg border-0 bg-slate-100/80 ring-1 ring-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-violet-300"
          />
          <Button
            onClick={() => onConnectRepository()}
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
            onClick={onLinkAllRepositories}
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
                    onDisconnect={() => onDisconnectRepository(connection.repositoryFullName)}
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
  );
}
