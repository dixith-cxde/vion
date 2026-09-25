"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  MessageSquare,
  Tags,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeDate, getGithubEntityHref } from "../shared/github-format";
import type {
  GitHubBranchSummary,
  GitHubCommitSummary,
  GitHubDiscussionSummary,
  GitHubIssueSummary,
  GitHubPullRequestSummary,
  GitHubReleaseSummary,
} from "@/lib/types/github";

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

export function BranchRow({ branch }: { branch: GitHubBranchSummary }) {
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
