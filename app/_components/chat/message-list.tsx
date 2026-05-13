"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatMessage } from "@/types/channel.type";
import { MessageGroup, shouldGroupMessages } from "./message-group";

type MessageListProps = {
  currentUserId: string;
  messages: ChatMessage[];
  isLoading?: boolean;
};

const AUTO_SCROLL_THRESHOLD = 96;

export function MessageList({ currentUserId, messages, isLoading }: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const previousSnapshotRef = useRef({
    firstMessageId: null as string | null,
    lastMessageId: null as string | null,
    scrollHeight: 0,
  });

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      "[data-slot='scroll-area-viewport']"
    );

    if (!viewport) {
      return;
    }

    const updateScrollIntent = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

      shouldAutoScrollRef.current = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
    };

    updateScrollIntent();

    viewport.addEventListener("scroll", updateScrollIntent, {
      passive: true,
    });

    return () => {
      viewport.removeEventListener("scroll", updateScrollIntent);
    };
  }, []);

  useLayoutEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLElement>(
      "[data-slot='scroll-area-viewport']"
    );

    if (!viewport) {
      return;
    }

    const previous = previousSnapshotRef.current;
    const nextFirstMessageId = messages[0]?.id ?? null;
    const nextLastMessageId = messages[messages.length - 1]?.id ?? null;
    const didPrependHistory =
      Boolean(previous.firstMessageId) &&
      previous.firstMessageId !== nextFirstMessageId &&
      previous.lastMessageId === nextLastMessageId;

    if (didPrependHistory) {
      const heightDelta = viewport.scrollHeight - previous.scrollHeight;

      if (heightDelta > 0) {
        viewport.scrollTop += heightDelta;
      }
    } else if (
      shouldAutoScrollRef.current ||
      !previous.lastMessageId ||
      messages[messages.length - 1]?.optimistic
    ) {
      bottomRef.current?.scrollIntoView({
        behavior: previous.lastMessageId ? "smooth" : "auto",
        block: "end",
      });
    }

    previousSnapshotRef.current = {
      firstMessageId: nextFirstMessageId,
      lastMessageId: nextLastMessageId,
      scrollHeight: viewport.scrollHeight,
    };
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-5 py-4">
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
    <ScrollArea ref={scrollAreaRef} className="min-h-0 flex-1">
      <div className="flex min-h-full flex-col justify-end px-3 py-4 sm:px-5">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="rounded-[20px] border border-dashed border-border/70 bg-muted/20 px-6 py-7 text-center">
              <p className="text-sm font-medium text-foreground">No messages yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start the conversation. New messages will appear here in realtime.
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : null;
          const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;

          return (
            <MessageGroup
              key={message.id}
              currentUserId={currentUserId}
              isGroupedWithNext={shouldGroupMessages(message, nextMessage)}
              isGroupedWithPrevious={shouldGroupMessages(previousMessage, message)}
              message={message}
            />
          );
        })}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
