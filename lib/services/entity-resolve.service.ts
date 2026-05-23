import { prisma } from "@/lib/prisma";

type ResolvableRelationship = {
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
};

export async function resolveEntityLabels<TRelationship extends ResolvableRelationship>(
  relationships: TRelationship[],
) {
  const workspaceIds = new Set<string>();
  const taskIds = new Set<string>();
  const documentIds = new Set<string>();
  const messageIds = new Set<string>();
  const commitIds = new Set<string>();
  const channelIds = new Set<string>();
  const userIds = new Set<string>();
  const externalMappingIds = new Set<string>();

  relationships.forEach((rel) => {
    if (rel.sourceEntityType === "WORKSPACE") workspaceIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "WORKSPACE") workspaceIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "TASK") taskIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "TASK") taskIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "DOCUMENT") documentIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "DOCUMENT") documentIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "MESSAGE") messageIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "MESSAGE") messageIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "COMMIT") commitIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "COMMIT") commitIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "CHANNEL") channelIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "CHANNEL") channelIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "USER") userIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "USER") userIds.add(rel.targetEntityId);

    if (rel.sourceEntityType.startsWith("GITHUB_")) externalMappingIds.add(rel.sourceEntityId);
    if (rel.targetEntityType.startsWith("GITHUB_")) externalMappingIds.add(rel.targetEntityId);
  });

  const [workspaces, tasks, documents, messages, commits, channels, users, externalMappings] = await Promise.all([
    prisma.workspace.findMany({
      where: { id: { in: Array.from(workspaceIds) } },
      select: { id: true, name: true },
    }),
    prisma.task.findMany({
      where: { id: { in: Array.from(taskIds) } },
      select: { id: true, title: true },
    }),
    prisma.document.findMany({
      where: { id: { in: Array.from(documentIds) } },
      select: { id: true, title: true },
    }),
    prisma.message.findMany({
      where: { id: { in: Array.from(messageIds) } },
      select: { id: true, content: true },
    }),
    prisma.commit.findMany({
      where: { id: { in: Array.from(commitIds) } },
      select: { id: true, message: true },
    }),
    prisma.channel.findMany({
      where: { id: { in: Array.from(channelIds) } },
      select: { id: true, name: true, slug: true },
    }),
    prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, name: true, username: true, email: true },
    }),
    prisma.externalMapping.findMany({
      where: { id: { in: Array.from(externalMappingIds) } },
      select: { id: true, entityType: true, externalId: true },
    }),
  ]);

  const workspaceMap = new Map(workspaces.map((w) => [w.id, w.name]));
  const taskMap = new Map(tasks.map((t) => [t.id, t.title]));
  const docMap = new Map(documents.map((d) => [d.id, d.title]));
  const msgMap = new Map(messages.map((m) => [m.id, m.content.slice(0, 40)]));
  const commitMap = new Map(commits.map((c) => [c.id, c.message]));
  const channelMap = new Map(
    channels.map((channel) => [channel.id, channel.name || channel.slug || "Conversation"]),
  );
  const userMap = new Map(
    users.map((user) => [user.id, user.name || user.username || user.email || "Unknown user"]),
  );
  const externalMap = new Map(externalMappings.map((mapping) => [mapping.id, mapping.externalId]));

  function getLabel(type: string, id: string) {
    switch (type) {
      case "WORKSPACE":
        return workspaceMap.get(id);
      case "TASK":
        return taskMap.get(id);
      case "DOCUMENT":
        return docMap.get(id);
      case "MESSAGE":
        return msgMap.get(id);
      case "COMMIT":
        return commitMap.get(id);
      case "CHANNEL":
        return channelMap.get(id);
      case "USER":
        return userMap.get(id);
      case "GITHUB_REPOSITORY":
      case "GITHUB_PULL_REQUEST":
      case "GITHUB_ISSUE":
      case "GITHUB_DISCUSSION":
      case "GITHUB_RELEASE":
      case "GITHUB_BRANCH":
        return externalMap.get(id) ?? type;
      default:
        return type;
    }
  }

  return relationships.map((rel) => ({
    ...rel,
    sourceLabel: getLabel(rel.sourceEntityType, rel.sourceEntityId),
    targetLabel: getLabel(rel.targetEntityType, rel.targetEntityId),
  }));
}
