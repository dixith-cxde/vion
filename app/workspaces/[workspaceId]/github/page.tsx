import { GithubWorkspacePage } from "@/app/_components/github/github-workspace-page";

type GithubPageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    entityType?: string;
    entityId?: string;
  }>;
};

export default async function WorkspaceGithubPage({ params, searchParams }: GithubPageProps) {
  const { workspaceId } = await params;
  const query = await searchParams;

  return (
    <GithubWorkspacePage
      workspaceId={workspaceId}
      initialEntityType={query.entityType}
      initialEntityId={query.entityId}
    />
  );
}
