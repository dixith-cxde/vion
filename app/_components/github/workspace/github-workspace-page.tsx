"use client";

import { useState } from "react";
import {
  FolderGit2,
  Link2,
  LoaderCircle,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useGithubWorkspace } from "@/lib/hooks/use-github-workspace";
import { isGithubEntityType } from "../shared/github-format";
import {
  WorkspaceConnectPrompt,
  WorkspaceEntitySection,
  WorkspaceLinkingSection,
  WorkspaceMetrics,
  WorkspaceRuntimeAttention,
} from "./workspace-sections";
import { WorkspaceTabs } from "./workspace-tabs";
import { GithubWorkspaceSkeleton } from "./workspace-skeleton";
import type { GitHubWorkspaceOverview } from "@/lib/types/github";

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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
      <WorkspaceHeader
        data={data}
        isFetching={isFetching}
        isDisconnectingGithubAccount={isDisconnectingGithubAccount}
        onGithubConnect={handleGithubConnect}
        onDisconnectGithub={() => void handleDisconnectGithub()}
        onRefresh={() => void refetch()}
      />

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {!data.account.connected ? (
          <WorkspaceConnectPrompt onGithubConnect={handleGithubConnect} />
        ) : (
          <div className="space-y-5">
            {!data.account.accessTokenAvailable ? (
              <WorkspaceRuntimeAttention data={data} onGithubConnect={handleGithubConnect} />
            ) : null}

            <WorkspaceMetrics data={data} />

            {data.error ? (
              <div className="border-l border-destructive/30 pl-4 text-sm text-muted-foreground">
                {data.error}
              </div>
            ) : null}

            <WorkspaceEntitySection
              workspaceId={workspaceId}
              entityType={entityType}
              entityId={initialEntityId ?? null}
            />

            <WorkspaceLinkingSection
              workspaceId={workspaceId}
              data={data}
              repositoryInput={repositoryInput}
              linkedRepositoryName={linkedRepositoryName}
              isConnectingRepository={isConnectingRepository}
              isLinkingAll={isLinkingAll}
              isDisconnectingRepository={isDisconnectingRepository}
              onRepositoryInputChange={setRepositoryInput}
              onConnectRepository={(repositoryFullName) => void handleConnectRepository(repositoryFullName)}
              onLinkAllRepositories={() => void handleLinkAllRepositories()}
              onDisconnectRepository={(repositoryFullName) => void handleDisconnectRepository(repositoryFullName)}
            />

            <WorkspaceTabs
              workspaceId={workspaceId}
              data={data}
              linkedRepositoryNames={linkedRepositoryNames}
              onConnectRepository={(repositoryFullName) => void handleConnectRepository(repositoryFullName)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceHeader({
  data,
  isFetching,
  isDisconnectingGithubAccount,
  onGithubConnect,
  onDisconnectGithub,
  onRefresh,
}: {
  data: GitHubWorkspaceOverview;
  isFetching: boolean;
  isDisconnectingGithubAccount: boolean;
  onGithubConnect: () => void;
  onDisconnectGithub: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="border-b px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">GitHub</h1>
          <p className="text-sm text-muted-foreground">
            Repository context, active work, and linked code surfaces for this workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onGithubConnect}>
            <FolderGit2 className="size-3.5" />
            {data.account.connected ? "Reconnect GitHub" : "Connect GitHub"}
          </Button>
          {data.account.connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onDisconnectGithub}
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
            onClick={onRefresh}
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
  );
}
