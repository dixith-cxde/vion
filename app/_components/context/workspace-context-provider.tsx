"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type WorkspaceContextType = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  reloadWorkspaces: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();

  const currentWorkspaceId =
    typeof params?.workspaceId === "string"
      ? params.workspaceId
      : params?.workspaceId?.[0];

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const reloadWorkspaces = useCallback(async () => {
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) {
        throw new Error("Failed to load workspaces");
      }
      const data = await res.json();

      setWorkspaces(data);
    } catch (err) {
      console.error("Failed to load workspaces", err);
      toast({
        title: "Unable to load workspaces",
        description: "Refresh the page and try again.",
        variant: "destructive",
      });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void reloadWorkspaces();
    });
  }, [reloadWorkspaces]);

  useEffect(() => {
    const shouldRedirectToDefaultWorkspace =
      pathname === "/" || pathname === "/workspaces";

    if (
      shouldRedirectToDefaultWorkspace &&
      !currentWorkspaceId &&
      workspaces.length > 0
    ) {
      router.replace(`/workspaces/${workspaces[0].id}`);
    }
  }, [currentWorkspaceId, pathname, workspaces, router]);

  const activeWorkspace = useMemo(() => {
    if (!currentWorkspaceId || workspaces.length === 0) return null;

    return workspaces.find((ws) => ws.id === currentWorkspaceId) ?? null;
  }, [currentWorkspaceId, workspaces]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, reloadWorkspaces }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("WorkspaceProvider missing");
  return ctx;
}
