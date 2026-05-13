import { InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "@/types/channel.type";

type SendMessagePayload = {
  workspaceId: string;
  content: string;
  contentJson: unknown;
};

type SendMessageParams = {
  channelId: string;
  payload: SendMessagePayload;
};

type ChannelMessagesResponse = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

async function sendMessage({ channelId, payload }: SendMessageParams): Promise<ChatMessage> {
  const response = await fetch(`/api/channels/${channelId}/messages`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("Failed to send message");

  const data = await response.json();
  return data.message;
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

      const tempId = `temp-${uuidv4()}`;

      const optimisticMessage = {
        id: tempId,

        type: "TEXT",

        workspaceId: payload.workspaceId,

        channelId,

        parentId: null,

        content: payload.content,

        contentJson: payload.contentJson ?? null,

        createdAt: new Date(),

        updatedAt: new Date(),

        deletedAt: null,

        isEdited: false,

        authorId: "optimistic",

        optimistic: true,

        author: {
          id: "optimistic",

          name: "Sending...",

          imageUrl: null,
        },

        reactions: [],

        attachments: [],

        replies: [],
      } satisfies ChatMessage;

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

            messages: [...updatedPages[0].messages, optimisticMessage],
          };

          return {
            ...old,

            pages: updatedPages,
          };
        }
      );

      return {
        previousMessages,

        tempId,
      };
    },

    onError: (_error, _payload, context) => {
      if (!context?.previousMessages) {
        return;
      }

      queryClient.setQueryData(["channel-messages", channelId], context.previousMessages);
    },

    onSuccess: (serverMessage, _payload, context) => {
      queryClient.setQueryData<InfiniteData<ChannelMessagesResponse>>(
        ["channel-messages", channelId],
        (old) => {
          if (!old) {
            return old;
          }

          const updatedPages = old.pages.map((page) => ({
            ...page,

            messages: page.messages.map((message) =>
              message.id === context?.tempId ? serverMessage : message
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
