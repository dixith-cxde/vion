"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "@/types/channel.type";
import { MessageItem } from "./message-item";

type MessageListProps = {
  messages: ChatMessage[];
  isLoading?: boolean;
};

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        {Array.from({
          length: 8,
        }).map((_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-10 rounded-full" />

            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="flex flex-col gap-1 p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center py-20">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        )}

        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
