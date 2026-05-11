import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChatMessage } from "@/types/channel.type";

type MessageItemProps = {
  message: ChatMessage;
};

export function MessageItem({ message }: MessageItemProps) {
  return (
    <div
      className="flex gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/40"
      data-optimistic={message.optimistic}
    >
      <Avatar className="size-10">
        <AvatarFallback>{message.author.name?.[0] ?? "U"}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{message.author.name}</p>

          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </span>

          {message.optimistic && <span className="text-xs text-muted-foreground">Sending...</span>}
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">
          {message.content}
        </p>
      </div>
    </div>
  );
}
