import { prisma } from "@/lib/prisma";
import { UniversalEntityType } from "./mention";
import { normalizeExternalValue } from "./mention";
export async function upsertGitHubEntityReference(params: {
  type: Extract<UniversalEntityType, `GITHUB_${string}`>;
  externalId: string;
  title?: string | null;
  repositoryFullName?: string | null;
  subtitle?: string | null;
}) {
  const normalizedExternalId = params.externalId.trim();
  const mappingId = `github:${params.type.toLowerCase()}:${normalizeExternalValue(normalizedExternalId)}`;

  await prisma.activity.create({
    data: {
      entityType: params.type,
      entityId: mappingId,
      action: "GITHUB_ENTITY_REGISTERED",
      metadata: {
        title: params.title ?? null,
        repositoryFullName: params.repositoryFullName ?? null,
        subtitle: params.subtitle ?? null,
      },
    },
  });

  return prisma.externalMapping.upsert({
    where: {
      id: mappingId,
    },
    update: {
      externalId: normalizedExternalId,
      externalType: params.type,
      entityType: params.type,
      entityId: mappingId,
    },
    create: {
      id: mappingId,
      externalId: normalizedExternalId,
      externalType: params.type,
      entityType: params.type,
      entityId: mappingId,
    },
  });
}
