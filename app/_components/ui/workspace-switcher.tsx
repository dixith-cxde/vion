"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { CreateWorkspaceDialog } from "@/app/_components/workspace/create-workspace-dialog";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { workspaces, activeWorkspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);

  if (!workspaces.length) return null;

  return (
    <>
      <Select
        value={activeWorkspace?.id}
        onValueChange={(value) => {
          if (value === "__create__") {
            setCreateOpen(true);
            return;
          }

          router.push(`/workspaces/${value}`);
        }}
      >
        <SelectTrigger className="h-auto w-fit border-none shadow-none focus:ring-0">
          <SelectValue placeholder="Select workspace" />
        </SelectTrigger>

        <SelectContent className="p-3">
          {workspaces.map((ws) => (
            <SelectItem key={ws.id} value={ws.id}>
              {ws.name}
            </SelectItem>
          ))}

          <SelectItem value="__create__">+ Create Workspace</SelectItem>
        </SelectContent>
      </Select>

      <CreateWorkspaceDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
