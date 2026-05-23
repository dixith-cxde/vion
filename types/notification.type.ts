export type NotificationWithSender = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  workspaceId: string | null;
  senderId: string | null;
  relationshipId: string | null;
  createdAt: Date | string;
  sender: {
    id: string;
    name: string;
    imageUrl: string | null;
  } | null;
};
