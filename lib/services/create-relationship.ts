import { prisma } from "@/lib/prisma";

type EntityType = "TASK" | "DOCUMENT" | "MESSAGE" | "COMMIT" | "CHANNEL";

type CreateRelationshipInput = {
  workspaceId: string;
  sourceEntityType: EntityType;
  sourceEntityId: string;
  targetEntityType: EntityType;
  targetEntityId: string;
  relationshipType: string;
};

async function validateEntity(
  entityType: EntityType,
  entityId: string,
  workspaceId: string,
) {
  switch (entityType) {
    case "TASK":
      return prisma.task.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "DOCUMENT":
      return prisma.document.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "MESSAGE":
      return prisma.message.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "COMMIT":
      return prisma.commit.findFirst({
        where: { id: entityId, workspaceId },
      });

    case "CHANNEL":
      return prisma.channel.findFirst({
        where: { id: entityId, workspaceId },
      });

    default:
      return null;
  }
}

export async function createRelationship(data: CreateRelationshipInput) {
  const {
    workspaceId,
    sourceEntityType,
    sourceEntityId,
    targetEntityType,
    targetEntityId,
    relationshipType,
  } = data;

  const existingRelationship = await prisma.relationship.findFirst({
    where: {
      workspaceId,
      sourceEntityType,
      sourceEntityId,
      targetEntityType,
      targetEntityId,
      relationshipType,
    },
  });

  if (existingRelationship) {
    return existingRelationship;
  }

  const source = await validateEntity(
    sourceEntityType,
    sourceEntityId,
    workspaceId,
  );

  if (!source) {
    throw new Error("Invalid source entity for workspace");
  }

  const target = await validateEntity(
    targetEntityType,
    targetEntityId,
    workspaceId,
  );

  if (!target) {
    throw new Error("Invalid target entity for workspace");
  }

  return prisma.relationship.create({
    data: {
      workspaceId,
      sourceEntityType,
      sourceEntityId,
      targetEntityType,
      targetEntityId,
      relationshipType,
    },
  });
}
