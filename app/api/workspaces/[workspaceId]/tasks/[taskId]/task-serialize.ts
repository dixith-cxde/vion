export function serializeTask(
  task: {
    assigneeId: string | null;
    assignee?: {
      id: string;
      name: string;
      email: string;
      imageUrl: string | null;
    } | null;
    createdBy?: {
      id: string;
      name: string;
      email: string;
      imageUrl: string | null;
    } | null;
  } & Record<string, unknown>
) {
  return {
    ...task,
    assignedToId: task.assigneeId,
    assignedTo: task.assignee ?? null,
  };
}
