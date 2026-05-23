import { Prisma } from "@/lib/generated/prisma/client";

export const chatUserSelect = {
  id: true,
  name: true,
  imageUrl: true,
  username: true,
} satisfies Prisma.UserSelect;

export const chatMessageInclude = {
  author: {
    select: chatUserSelect,
  },
  reactions: {
    include: {
      user: {
        select: chatUserSelect,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  attachments: true,
  mentions: {
    include: {
      user: {
        select: chatUserSelect,
      },
    },
  },
  reads: {
    include: {
      user: {
        select: chatUserSelect,
      },
    },
  },
  pinnedMessages: {
    include: {
      pinnedBy: {
        select: chatUserSelect,
      },
    },
  },
  parent: {
    select: {
      id: true,
      authorId: true,
      content: true,
      createdAt: true,
      type: true,
    },
  },
  _count: {
    select: {
      replies: true,
    },
  },
} satisfies Prisma.MessageInclude;

export const chatChannelInclude = {
  createdBy: {
    select: chatUserSelect,
  },
  members: {
    include: {
      user: {
        select: chatUserSelect,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  messages: {
    where: {
      deletedAt: null,
      parentId: null,
    },
    include: chatMessageInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
  },
  pinnedMessages: {
    include: {
      pinnedBy: {
        select: chatUserSelect,
      },
      message: {
        include: chatMessageInclude,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  },
} satisfies Prisma.ChannelInclude;

export type ChatMessageRecord = Prisma.MessageGetPayload<{
  include: typeof chatMessageInclude;
}>;

export type ChatChannelRecord = Prisma.ChannelGetPayload<{
  include: typeof chatChannelInclude;
}>;

export type ChatChannelMemberState = {
  id: string;
  userId: string;
  channelId: string;
  role: string;
  lastReadAt: Date | null;
  lastReadMessageId: string | null;
  mutedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatChannelSummary = ChatChannelRecord & {
  currentMember: ChatChannelMemberState | null;
  unreadCount: number;
  activityAt: Date;
  typingUserIds: string[];
  presenceUserIds: string[];
};

export function getChannelActivityAt(channel: Pick<ChatChannelRecord, "updatedAt" | "messages">) {
  return channel.messages[0]?.createdAt ?? channel.updatedAt;
}

export function sortChannelsByActivity<T extends Pick<ChatChannelSummary, "activityAt">>(
  channels: T[],
) {
  return [...channels].sort(
    (left, right) => new Date(right.activityAt).getTime() - new Date(left.activityAt).getTime(),
  );
}

export function extractMentionTokens(content: string) {
  const tokens = content.match(/(^|\s)@([a-zA-Z0-9._-]{2,50})/g) ?? [];

  return Array.from(
    new Set(
      tokens
        .map((token) => token.trim().slice(1))
        .map((token) => token.toLowerCase())
        .filter(Boolean),
    ),
  );
}

export function formatMessagePreview(message?: Pick<ChatMessageRecord, "content" | "type" | "attachments"> | null) {
  if (!message) {
    return "";
  }

  if (message.type === "SYSTEM") {
    return "System update";
  }

  if (message.type === "ACTIVITY") {
    return message.content?.trim() || "Activity update";
  }

  if (message.type === "AI") {
    return `AI: ${message.content?.trim() || "Generated update"}`;
  }

  const trimmed = message.content?.trim();

  if (trimmed) {
    return trimmed;
  }

  if (message.attachments.length > 0) {
    return message.attachments.length === 1 ? "1 attachment" : `${message.attachments.length} attachments`;
  }

  return "Message";
}
