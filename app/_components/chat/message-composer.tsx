"use client";

import { KeyboardEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useSendMessage } from "@/lib/hooks/chat/use-send-message";

type MessageComposerProps = {
  channelId: string;
};

export function MessageComposer({ channelId }: MessageComposerProps) {
  const [content, setContent] = useState("");

  const mutation = useSendMessage(channelId);

  async function handleSend() {
    const trimmed = content.trim();

    if (!trimmed) {
      return;
    }

    setContent("");

    try {
      await mutation.mutateAsync({
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
    <div className="bg-background">
      <Separator />

      <div className="p-4">
        <div className="flex items-end gap-3 rounded-xl border bg-background p-3 shadow-sm">
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="min-h-[56px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />

          <Button size="icon" onClick={handleSend} disabled={mutation.isPending}>
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
