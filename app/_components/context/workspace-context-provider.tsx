"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  const { workspaceId } = useParams();
  const currentWorkspaceId =
    typeof workspaceId === "string" ? workspaceId : workspaceId?.[0];

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/workspaces")
      .then((res) => res.json())
      .then((data) => {
        setWorkspaces(data);

        const matched = data.find(
          (ws: Workspace) => ws.id === currentWorkspaceId,
        );

        setActiveWorkspace(matched ?? data[0] ?? null);
      });
  }, [currentWorkspaceId]);

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
