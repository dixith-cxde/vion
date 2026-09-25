"use client";

import { GitBranch } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EntityCard } from "./workspace-cards";
import {
  CommitRow,
  DiscussionRow,
  IssueRow,
  PullRequestRow,
  ReleaseRow,
  RepositoryRow,
} from "./workspace-rows";
import type {
  GitHubBranchSummary,
  GitHubWorkspaceOverview,
} from "@/lib/types/github";

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

export function WorkspaceTabs({
  workspaceId,
  data,
  linkedRepositoryNames,
  onConnectRepository,
}: {
  workspaceId: string;
  data: GitHubWorkspaceOverview;
  linkedRepositoryNames: Set<string>;
  onConnectRepository: (repositoryFullName: string) => void;
}) {
  const linkedRepositoryData = data.linkedRepositoryData;

  return (
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
                        onLink={() => onConnectRepository(repository.fullName)}
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
  );
}
