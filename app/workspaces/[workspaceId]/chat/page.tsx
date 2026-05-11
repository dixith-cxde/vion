import { ChatWorkspace } from "@/app/_components/chat/chat-workspace";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function ChatPage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;

  return (
    <section className="h-[calc(100vh-4rem)] overflow-hidden p-4">
      <ChatWorkspace workspaceId={workspaceId} />
    </section>
  );
}
