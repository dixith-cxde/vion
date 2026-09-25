"use client";

import { FolderGit2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BranchRow,
  CommitRow,
  DiscussionRow,
  IssueRow,
  PullRequestRow,
  ReleaseRow,
} from "./repository-rows";
import type { GitHubRepositoryDetail } from "@/lib/types/github";

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

export function EntityCard({
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

export function RepositoryTabs({
  workspaceId,
  repository,
}: {
  workspaceId: string;
  repository: GitHubRepositoryDetail;
}) {
  return (
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
  );
}
