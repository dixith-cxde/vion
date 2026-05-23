"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers3, Loader2 } from "lucide-react";

import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type CreateWorkspaceDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CreateWorkspaceDialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: CreateWorkspaceDialogProps) {
  const router = useRouter();
  const { reloadWorkspaces } = useWorkspace();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, setIsPending] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);

    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }

    if (!nextOpen) {
      setName("");
    }
  }

  async function handleCreateWorkspace() {
    const trimmedName = name.trim();

    if (!trimmedName || isPending) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        throw new Error("Failed to create workspace");
      }

      const workspace = (await response.json()) as { id: string };

      await reloadWorkspaces();
      setOpen(false);
      router.push(`/workspaces/${workspace.id}`);
    } catch (error) {
      console.error("CREATE_WORKSPACE_ERROR", error);
      toast({
        title: "Workspace creation failed",
        description: "The workspace could not be created.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger asChild>{children}</DialogTrigger> : null}

      <DialogContent className="border-0 bg-background p-0 shadow-none sm:max-w-xl">
        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
                  <Layers3 className="size-3.5" />
                  Workspace
                </div>
                <DialogTitle className="text-xl font-semibold">Create workspace</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-6">
                  Name the workspace and create it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="space-y-3">
            <Label htmlFor="workspace-name" className="text-sm font-medium">
              Workspace name
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleCreateWorkspace();
                }
              }}
              placeholder="VION Platform"
              disabled={isPending}
              maxLength={120}
              autoFocus
              className="h-12 rounded-lg border-0 bg-white ring-1 ring-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-violet-300"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              Documents, tasks, channels, and GitHub context will live inside this workspace.
            </p>
          </div>

          <div className="border-l border-violet-200 pl-4">
            <p className="text-sm font-medium text-slate-900">Default access</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Document and task access currently follows workspace membership roles. Per-entity role
              policies are not wired in this build yet.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <Button variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || isPending} onClick={() => void handleCreateWorkspace()}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating
              </>
            ) : (
              "Create workspace"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
