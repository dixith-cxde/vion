"use client";

import { KeyboardEvent, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useSendMessage } from "@/lib/hooks/chat/use-send-message";

type MessageComposerProps = {
  channelId: string;
  workspaceId: string;
};

export function MessageComposer({ channelId, workspaceId }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mutation = useSendMessage(channelId);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [content]);

  async function handleSend() {
    const trimmed = content.trim();

    if (!trimmed) {
      return;
    }

    setContent("");

    try {
      await mutation.mutateAsync({
        workspaceId,
        content: trimmed,
        contentJson: null,
      });
    } catch {
      setContent(trimmed);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      handleSend();
    }
  }

  return (
    <div className="shrink-0 bg-background/92 backdrop-blur">
      <Separator />

      <div className="p-4">
        <div
          className={cn(
            "flex items-end gap-3 rounded-[22px] border border-border/70 bg-background px-4 py-3 transition-colors",
            "focus-within:border-primary/30"
          )}
        >
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            className="max-h-[220px] min-h-[28px] resize-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0"
          />

          <Button
            size="icon"
            onClick={handleSend}
            disabled={mutation.isPending || content.trim().length === 0}
            className="mb-0.5 shrink-0 rounded-full"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
