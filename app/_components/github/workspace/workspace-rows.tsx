"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  FolderGit2,
  GitCommitHorizontal,
  GitPullRequest,
  Link2,
  MessageSquare,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeDate, getGithubEntityHref } from "../shared/github-format";
import type {
  GitHubCommitSummary,
  GitHubDiscussionSummary,
  GitHubIssueSummary,
  GitHubPullRequestSummary,
  GitHubReleaseSummary,
  GitHubRepositorySummary,
} from "@/lib/types/github";

export function RepositoryRow({
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

export function PullRequestRow({
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

export function IssueRow({
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

export function CommitRow({ commit }: { commit: GitHubCommitSummary }) {
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

export function ReleaseRow({
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

export function DiscussionRow({
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
