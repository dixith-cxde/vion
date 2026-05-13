import { ChatMessage } from "@/types/channel.type";
import { MessageItem } from "./message-item";

type MessageGroupProps = {
  currentUserId: string;
  isGroupedWithNext: boolean;
  isGroupedWithPrevious: boolean;
  message: ChatMessage;
};

const GROUPING_WINDOW_MS = 5 * 60 * 1000;

export function shouldGroupMessages(
  previousMessage: ChatMessage | null,
  currentMessage: ChatMessage | null
) {
  if (!previousMessage || !currentMessage) {
    return false;
  }

  if (previousMessage.authorId !== currentMessage.authorId) {
    return false;
  }

  const previousCreatedAt = new Date(previousMessage.createdAt).getTime();
  const currentCreatedAt = new Date(currentMessage.createdAt).getTime();

  return currentCreatedAt - previousCreatedAt <= GROUPING_WINDOW_MS;
}

export function MessageGroup({
  currentUserId,
  isGroupedWithNext,
  isGroupedWithPrevious,
  message,
}: MessageGroupProps) {
  return (
    <div className={isGroupedWithPrevious ? "mt-0.5" : "mt-3 first:mt-0"}>
      <MessageItem
        currentUserId={currentUserId}
        isGroupedWithNext={isGroupedWithNext}
        message={message}
      />
    </div>
  );
}
