import { WorkspaceSidebarShell } from "@/app/_components/workspace/workspace-sidebar-shell";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceSidebarShell>{children}</WorkspaceSidebarShell>;
}
