import { prisma } from "@/lib/prisma";

export async function createRelationship(data: {
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  relationshipType: string;
}) {
  return prisma.relationship.create({
    data,
  });
}
