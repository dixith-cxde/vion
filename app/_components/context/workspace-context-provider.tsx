"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Workspace = {
  id: string;
  name: string;
  role: string;
};

type WorkspaceContextType = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();

  const currentWorkspaceId =
    typeof params?.workspaceId === "string"
      ? params.workspaceId
      : params?.workspaceId?.[0];

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/workspaces");
        const data = await res.json();

        setWorkspaces(data);
      } catch (err) {
        console.error("Failed to load workspaces", err);
      }
    }

    load();
  }, []);

  const activeWorkspace = useMemo(() => {
    if (!currentWorkspaceId || workspaces.length === 0) return null;

    return workspaces.find((ws) => ws.id === currentWorkspaceId) ?? null;
  }, [currentWorkspaceId, workspaces]);

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("WorkspaceProvider missing");
  return ctx;
}
