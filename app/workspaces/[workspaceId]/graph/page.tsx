import { WorkspaceGraph } from "@/app/_components/graph/workspace-graph";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
  searchParams: Promise<{
    entityType?: string;
    entityId?: string;
  }>;
};

export default async function GraphPage({ params, searchParams }: WorkspacePageProps) {
  const { workspaceId } = await params;
  const query = await searchParams;

  return (
    <WorkspaceGraph
      workspaceId={workspaceId}
      initialEntityId={query.entityId}
      initialEntityType={query.entityType}
    />
  );
}
