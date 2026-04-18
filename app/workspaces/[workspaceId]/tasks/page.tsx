type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function TasksPage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;

  return (
    <section className="min-h-[calc(100vh-4rem)] bg-background px-4 py-8 md:px-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace <span className="font-mono">{workspaceId}</span>
        </p>
      </div>
    </section>
  );
}
