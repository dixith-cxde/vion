import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { MessageWithRelations } from "@/types/message.type";
import { Prisma } from "@/lib/generated/prisma/client";

type SendMessagePayload = {
  content: string;
  contentJson: unknown;
};

type SendMessageParams = {
  channelId: string;
  payload: SendMessagePayload;
};

type ChannelMessagesResponse = {
  messages: MessageWithRelations[];
  nextCursor: string | null;
};

async function sendMessage({
  channelId,
  payload,
}: SendMessageParams): Promise<MessageWithRelations> {
  const response = await fetch(`/api/channels/${channelId}/messages`, {
    method: "POST",

    credentials: "include",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  return response.json();
}

export function useSendMessage(channelId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      sendMessage({
        channelId,
        payload,
      }),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: ["channel-messages", channelId],
      });

      const previousMessages = queryClient.getQueryData<InfiniteData<ChannelMessagesResponse>>([
        "channel-messages",
        channelId,
      ]);

      const optimisticMessage: MessageWithRelations = {
        id: `temp-${uuidv4()}`,
        channelId,
        content: payload.content,
        contentJson: payload.contentJson ?? Prisma.JsonNull,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        replyToId: null,
        authorId: "optimistic",
        author: {
          id: "optimistic",
          name: "Sending...",
          imageUrl: null,
        },
        reactions: [],
        attachments: [],
        replies: [],
      };

      queryClient.setQueryData<InfiniteData<ChannelMessagesResponse>>(
        ["channel-messages", channelId],
        (old) => {
          if (!old) {
            return {
              pages: [
                {
                  messages: [optimisticMessage],
                  nextCursor: null,
                },
              ],
              pageParams: [null],
            };
          }

          const updatedPages = [...old.pages];

          updatedPages[0] = {
            ...updatedPages[0],
            messages: [optimisticMessage, ...updatedPages[0].messages],
          };

          return {
            ...old,
            pages: updatedPages,
          };
        }
      );

      return {
        previousMessages,
      };
    },

    onError: (_error, _payload, context) => {
      if (!context?.previousMessages) {
        return;
      }

      queryClient.setQueryData(["channel-messages", channelId], context.previousMessages);
    },

    onSuccess: (serverMessage) => {
      queryClient.setQueryData<InfiniteData<ChannelMessagesResponse>>(
        ["channel-messages", channelId],
        (old) => {
          if (!old) {
            return old;
          }

          const updatedPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((message) =>
              message.id.startsWith("temp-") ? serverMessage : message
            ),
          }));

          return {
            ...old,
            pages: updatedPages,
          };
        }
      );
    },
  });
}
