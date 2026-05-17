"use client";

import { useState } from "react";
import { Hash, Loader2, Lock } from "lucide-react";
import { ChannelVisibility } from "@/lib/generated/prisma/enums";
import { useChatWorkspace } from "./channel-workspace-provider";
import { useCreateChannel } from "@/lib/hooks/chat/use-create-channel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CreateChannelModalProps = {
  children: React.ReactNode;
};

export function CreateChannelModal({ children }: CreateChannelModalProps) {
  const { workspaceId } = useChatWorkspace();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");

  const [description, setDescription] = useState("");

  const [visibility, setVisibility] = useState<ChannelVisibility>(ChannelVisibility.PUBLIC);

  const { mutateAsync, isPending } = useCreateChannel(workspaceId);

  async function handleCreateChannel() {
    const trimmedName = name.trim();

    if (!trimmedName || isPending) {
      return;
    }

    try {
      await mutateAsync({
        workspaceId,

        name: trimmedName,

        description: description.trim() || undefined,

        visibility,

        type: "GROUP",

        memberIds: [],
      });

      setName("");

      setDescription("");

      setVisibility(ChannelVisibility.PUBLIC);

      setOpen(false);
    } catch (error) {
      console.error("CREATE_CHANNEL_ERROR", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="border-border/60 bg-background sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Create channel</DialogTitle>

          <DialogDescription>
            Create a shared collaborative space for communication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel name</Label>

            <Input
              id="channel-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="frontend"
              maxLength={100}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description</Label>

            <Textarea
              id="channel-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Discuss frontend architecture and implementation"
              disabled={isPending}
              className="min-h-28 resize-none"
            />
          </div>

          <div className="space-y-3">
            <Label>Visibility</Label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setVisibility(ChannelVisibility.PUBLIC)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  visibility === ChannelVisibility.PUBLIC
                    ? "border-primary bg-primary/10"
                    : "border-border/60 hover:bg-muted/40"
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Hash className="size-4" />

                  <span className="font-medium">Public</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Visible and accessible to workspace members.
                </p>
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => setVisibility(ChannelVisibility.PRIVATE)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-all",
                  visibility === ChannelVisibility.PRIVATE
                    ? "border-primary bg-primary/10"
                    : "border-border/60 hover:bg-muted/40"
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Lock className="size-4" />

                  <span className="font-medium">Private</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Only invited members can access this channel.
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
              Cancel
            </Button>

            <Button disabled={!name.trim() || isPending} onClick={handleCreateChannel}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Creating
                </>
              ) : (
                "Create channel"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
