import { ChatWorkspaceProvider } from "@/app/_components/chat/channel-workspace-provider";
import { ChatWorkspace } from "@/app/_components/chat/chat-workspace";
import { getCurrentDBUser } from "@/lib/services/user.service";

type WorkspacePageProps = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export default async function ChatPage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;

  const user = await getCurrentDBUser();

  if (!user?.id) {
    return <div className="flex h-full w-full items-center justify-center">Loading user...</div>;
  }

  return (
    <section className="h-[calc(100vh-4rem)] overflow-hidden p-4">
      <ChatWorkspaceProvider workspaceId={workspaceId} currentUserId={user.id}>
        <ChatWorkspace />
      </ChatWorkspaceProvider>
    </section>
  );
}
