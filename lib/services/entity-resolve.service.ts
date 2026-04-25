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
  const taskIds = new Set<string>();
  const documentIds = new Set<string>();
  const messageIds = new Set<string>();
  const commitIds = new Set<string>();

  relationships.forEach((rel) => {
    if (rel.sourceEntityType === "TASK") taskIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "TASK") taskIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "DOCUMENT")
      documentIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "DOCUMENT")
      documentIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "MESSAGE") messageIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "MESSAGE") messageIds.add(rel.targetEntityId);

    if (rel.sourceEntityType === "COMMIT") commitIds.add(rel.sourceEntityId);
    if (rel.targetEntityType === "COMMIT") commitIds.add(rel.targetEntityId);
  });

  const [tasks, documents, messages, commits] = await Promise.all([
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
  ]);

  const taskMap = new Map(tasks.map((t) => [t.id, t.title]));
  const docMap = new Map(documents.map((d) => [d.id, d.title]));
  const msgMap = new Map(messages.map((m) => [m.id, m.content.slice(0, 40)]));
  const commitMap = new Map(commits.map((c) => [c.id, c.message]));

  function getLabel(type: string, id: string) {
    switch (type) {
      case "TASK":
        return taskMap.get(id);
      case "DOCUMENT":
        return docMap.get(id);
      case "MESSAGE":
        return msgMap.get(id);
      case "COMMIT":
        return commitMap.get(id);
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
