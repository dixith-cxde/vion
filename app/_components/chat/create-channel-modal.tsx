"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { ChannelVisibility } from "@/lib/generated/prisma/enums";
import { useChatWorkspace } from "./channel-workspace-provider";
import { useCreateChannel } from "@/lib/hooks/chat/use-create-channel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CreateChannelModalProps = {
  children: React.ReactNode;
};

export function CreateChannelModal({ children }: CreateChannelModalProps) {
  const { workspaceId } = useChatWorkspace();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");

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

        visibility,

        type: "GROUP",

        memberIds: [],
      });

      setName("");

      setVisibility(ChannelVisibility.PUBLIC);

      setOpen(false);
    } catch (error) {
      console.error("CREATE_CHANNEL_ERROR", error);
    }
  }

  return (
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="border-0 bg-background p-0 shadow-none sm:max-w-2xl">
        <div className="px-6 pb-6 pt-5 sm:px-8">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Create channel
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Add a name and choose visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-5">
            <div className="space-y-3">
              <Label htmlFor="channel-name" className="text-sm font-medium text-foreground">
                Channel name
              </Label>
              <Input
                id="channel-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="frontend-platform"
                maxLength={100}
                disabled={isPending}
                className="h-12 rounded-lg border-0 bg-rose-50/70 px-4 shadow-none ring-1 ring-rose-100 focus-visible:ring-2 focus-visible:ring-rose-300"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(value) => setVisibility(value as ChannelVisibility)}
                disabled={isPending}
              >
                <SelectTrigger className="h-12 rounded-lg border-0 bg-rose-50/70 px-4 shadow-none ring-1 ring-rose-100 focus:ring-2 focus:ring-rose-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ChannelVisibility.PUBLIC}>Public channel</SelectItem>
                  <SelectItem value={ChannelVisibility.PRIVATE}>Private channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:px-8">
          <Button variant="ghost" disabled={isPending} onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button disabled={!name.trim() || isPending} onClick={() => void handleCreateChannel()}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating
              </>
            ) : (
              "Create channel"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
