"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, RedirectToSignIn } from "@clerk/nextjs";
import { useWorkspace } from "../_components/context/workspace-context-provider";

export default function WorkspacesPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const { activeWorkspace, workspaces } = useWorkspace();

  const workspaceId = activeWorkspace?.id;

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) return;

    if (workspaceId) {
      router.replace(`/workspaces/${workspaceId}`);
      return;
    }

    // If no active but list exists → pick first
    if (workspaces?.length > 0) {
      router.replace(`/workspaces/${workspaces[0].id}`);
      return;
    }

    // If no workspace → create flow
    // router.replace("/onboarding");
  }, [isLoaded, isSignedIn, workspaceId, workspaces, router]);

  // Loading UI
  if (!isLoaded) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center">
        <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Auth guard
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="w-full min-h-screen flex justify-center items-center">
      <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full" />
    </div>
  );
}
