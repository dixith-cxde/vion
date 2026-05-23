import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatMessage } from "@/types/channel.type";

type MessageItemProps = {
  currentUserId: string;
  isGroupedWithNext?: boolean;
  message: ChatMessage;
};

export function MessageItem({
  currentUserId,
  isGroupedWithNext = false,
  message,
}: MessageItemProps) {
  const isCurrentUser = message.optimistic || message.authorId === currentUserId;
  const authorLabel = message.author.name?.trim() || "Unknown user";
  const showIncomingAvatar = !isCurrentUser && !isGroupedWithNext;
  const isSpecialType = message.type !== "TEXT";
  const readCount = message.reads.filter((read) => read.userId !== currentUserId).length;
  const reactionSummary = Array.from(
    message.reactions.reduce((map, reaction) => {
      map.set(reaction.emoji, (map.get(reaction.emoji) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  );

  return (
    <div
      className={cn(
        "group/message flex w-full px-2 py-0.5 transition-[opacity,transform] duration-200",
        isCurrentUser ? "justify-end" : "justify-start"
      )}
      data-optimistic={message.optimistic}
    >
      <div
        className={cn(
          "flex w-full max-w-3xl gap-3",
          isCurrentUser ? "justify-end" : "flex-row"
        )}
      >
        {!isCurrentUser ? (
          <div className="flex w-7 shrink-0 justify-center pt-1">
            {showIncomingAvatar ? (
              <Avatar size="sm" className="size-7">
                <AvatarImage src={message.author.imageUrl ?? undefined} />
                <AvatarFallback>{authorLabel.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-7 w-7" />
            )}
          </div>
        ) : null}

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            isCurrentUser ? "items-end text-right" : "items-start text-left"
          )}
        >
          <div
            className={cn(
              "inline-block max-w-full rounded-2xl border px-3.5 py-2.5 text-sm leading-6",
              isCurrentUser
                ? "border-primary/10 bg-primary/8 text-foreground"
                : "border-border/60 bg-muted/55 text-foreground",
              isSpecialType && "border-border/80 bg-background/70",
              message.optimistic && "opacity-80"
            )}
          >
            {isSpecialType ? (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {message.type}
              </p>
            ) : null}

            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>

          {reactionSummary.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {reactionSummary.map(([emoji, count]) => (
                <span
                  key={emoji}
                  className="rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {emoji} {count}
                </span>
              ))}
            </div>
          ) : null}

          {!isGroupedWithNext ? (
            <div
              className={cn(
                "mt-1.5 flex items-center gap-2 text-xs text-muted-foreground",
                isCurrentUser ? "justify-end" : "justify-start"
              )}
            >
              <p className="text-sm font-semibold text-foreground">{authorLabel}</p>

              <span>{format(new Date(message.createdAt), "h:mm a")}</span>

              {message.pinnedMessages.length > 0 ? <span>Pinned</span> : null}

              {message._count.replies > 0 ? <span>{message._count.replies} replies</span> : null}

              {readCount > 0 ? <span>Read by {readCount}</span> : null}

              {message.optimistic ? <span>Sending...</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
