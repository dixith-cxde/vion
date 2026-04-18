"use client";

import { useRouter } from "next/navigation";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

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

  if (!workspaces.length) return null;

  return (
    <Select
      value={activeWorkspace?.id}
      onValueChange={(value) => {
        if (value === "__create__") {
          router.push("/workspaces/new");
          return;
        }

        router.push(`/workspaces/${value}/documents`);
      }}
    >
      <SelectTrigger className="w-fit border-none shadow-none focus:ring-0  h-auto">
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
  );
}
