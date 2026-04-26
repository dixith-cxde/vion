"use client";

import { WorkspaceProvider } from "../_components/context/workspace-context-provider";
import { AppSidebarShell } from "../_components/sidebar/app-sidebar-shell";
import { SocketProvider } from "../_components/provider/socket-provider";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center">
        <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <WorkspaceProvider>
      <SocketProvider />
      <AppSidebarShell>{children}</AppSidebarShell>
    </WorkspaceProvider>
  );
}
