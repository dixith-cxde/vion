"use client";

import { createContext, useContext, useMemo, useState } from "react";

type ChatWorkspaceContextType = {
  workspaceId: string;
  currentUserId: string;
  activeChannelId: string | null;
  setActiveChannelId: (value: string | null) => void;
  activeDMUserId: string | null;
  setActiveDMUserId: (value: string | null) => void;
};

const ChatWorkspaceContext = createContext<ChatWorkspaceContextType | null>(null);

type ChatWorkspaceProviderProps = {
  workspaceId: string;
  currentUserId: string;
  children: React.ReactNode;
};

export function ChatWorkspaceProvider({
  workspaceId,
  currentUserId,
  children,
}: ChatWorkspaceProviderProps) {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeDMUserId, setActiveDMUserId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      workspaceId,
      currentUserId,
      activeChannelId,
      setActiveChannelId,
      activeDMUserId,
      setActiveDMUserId,
    }),
    [workspaceId, currentUserId, activeChannelId, activeDMUserId]
  );

  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>;
}

export function useChatWorkspace() {
  const context = useContext(ChatWorkspaceContext);

  if (!context) {
    throw new Error("useChatWorkspace must be used within ChatWorkspaceProvider");
  }

  return context;
}
