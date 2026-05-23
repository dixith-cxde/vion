"use client";

import { useState } from "react";
import { Hash, Loader2, Lock, MessageSquareText, Radar } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [topic, setTopic] = useState("");

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

        topic: topic.trim() || undefined,

        visibility,

        type: "GROUP",

        memberIds: [],
      });

      setName("");

      setDescription("");

      setTopic("");

      setVisibility(ChannelVisibility.PUBLIC);

      setOpen(false);
    } catch (error) {
      console.error("CREATE_CHANNEL_ERROR", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="border-border/60 bg-background p-0 sm:max-w-2xl">
        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-foreground">
                <MessageSquareText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Create channel</DialogTitle>
                <DialogDescription className="mt-1">
                  Open a shared room for focused collaboration, linked activity, and entity-aware
                  discussions.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-6 px-6 py-5">
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="channel-name">Channel name</Label>
                  <Input
                    id="channel-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="frontend-platform"
                    maxLength={100}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel-topic">Topic</Label>
                  <Input
                    id="channel-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="Delivery, release planning, and review flow"
                    maxLength={120}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channel-description">Description</Label>
                  <Textarea
                    id="channel-description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Discuss architecture, implementation details, linked tasks, and related pull requests."
                    disabled={isPending}
                    className="min-h-28 resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(value) => setVisibility(value as ChannelVisibility)}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ChannelVisibility.PUBLIC}>Public channel</SelectItem>
                      <SelectItem value={ChannelVisibility.PRIVATE}>Private channel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Preview
                </p>

                <div className="mt-4 rounded-2xl border border-border/60 bg-background/85 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/35 text-muted-foreground">
                      {visibility === ChannelVisibility.PUBLIC ? (
                        <Hash className="size-4" />
                      ) : (
                        <Lock className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {name.trim() || "new-channel"}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                        {description.trim() || "Collaborative channel for connected workspace work."}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Radar className="size-3.5" />
                      <span>{topic.trim() || "No topic set yet"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {visibility === ChannelVisibility.PUBLIC ? (
                        <Hash className="size-3.5" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      <span>
                        {visibility === ChannelVisibility.PUBLIC
                          ? "Visible to workspace members"
                          : "Restricted to invited members"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <VisibilityCard
                active={visibility === ChannelVisibility.PUBLIC}
                icon={<Hash className="size-4" />}
                title="Public"
                description="Best for shared delivery, planning, and cross-team runtime activity."
                onClick={() => setVisibility(ChannelVisibility.PUBLIC)}
                disabled={isPending}
              />
              <VisibilityCard
                active={visibility === ChannelVisibility.PRIVATE}
                icon={<Lock className="size-4" />}
                title="Private"
                description="Best for sensitive threads, leadership coordination, or focused review rooms."
                onClick={() => setVisibility(ChannelVisibility.PRIVATE)}
                disabled={isPending}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
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

function VisibilityCard({
  active,
  description,
  disabled,
  icon,
  onClick,
  title,
}: {
  active: boolean;
  description: string;
  disabled: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all",
        active ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/40"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="font-medium">{title}</span>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">{description}</p>
    </button>
  );
}
