export function getUserRoom(userId: string) {
  return `user:${userId}`;
}

export function getChannelRoom(channelId: string) {
  return `channel:${channelId}`;
}

export function getWorkspaceRoom(workspaceId: string) {
  return `workspace:${workspaceId}`;
}

export function getDocumentRoom(documentId: string) {
  return `document:${documentId}`;
}

export function getTaskRoom(taskId: string) {
  return `task:${taskId}`;
}
