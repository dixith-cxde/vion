"use client";

import Link from "next/link";
import { ArrowUpRight, FolderGit2, Link2, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeDate } from "../shared/github-format";
import { CommitRow } from "./workspace-rows";
import type {
  GitHubWorkspaceEntityDetail,
  GitHubWorkspaceOverview,
} from "@/lib/types/github";

export function MetricCard({
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

export function LinkedRepositoryCard({
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

export function EntityCard({
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

export function GithubEntityDetailCard({
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
