import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { createRelationship } from "@/lib/services/create-relationship";
import { createRelationshipSchema } from "@/lib/validators/relationship";

export type LinkedEntity = {
  relationshipId: string;
  relationshipType: string;
  direction: "outgoing" | "incoming";
  entityType: "TASK" | "DOCUMENT";
  entityId: string;
  title: string;
};

export type RelationshipsGetResponse = {
  success: boolean;
  data: LinkedEntity[];
};

export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: "entityType and entityId are required" },
        { status: 400 },
      );
    }

    if (entityType !== "TASK" && entityType !== "DOCUMENT") {
      return NextResponse.json(
        { success: false, error: "entityType must be TASK or DOCUMENT" },
        { status: 400 },
      );
    }

    // Fetch relationships where this entity is source OR target
    const [outgoing, incoming] = await Promise.all([
      prisma.relationship.findMany({
        where: {
          workspaceId,
          sourceEntityType: entityType,
          sourceEntityId: entityId,
          targetEntityType: { in: ["TASK", "DOCUMENT"] },
        },
        select: {
          id: true,
          relationshipType: true,
          targetEntityType: true,
          targetEntityId: true,
        },
      }),
      prisma.relationship.findMany({
        where: {
          workspaceId,
          targetEntityType: entityType,
          targetEntityId: entityId,
          sourceEntityType: { in: ["TASK", "DOCUMENT"] },
        },
        select: {
          id: true,
          relationshipType: true,
          sourceEntityType: true,
          sourceEntityId: true,
        },
      }),
    ]);

    // Collect entity IDs to resolve titles
    const taskIds = new Set<string>();
    const documentIds = new Set<string>();

    for (const rel of outgoing) {
      if (rel.targetEntityType === "TASK") taskIds.add(rel.targetEntityId);
      if (rel.targetEntityType === "DOCUMENT") documentIds.add(rel.targetEntityId);
    }

    for (const rel of incoming) {
      if (rel.sourceEntityType === "TASK") taskIds.add(rel.sourceEntityId);
      if (rel.sourceEntityType === "DOCUMENT") documentIds.add(rel.sourceEntityId);
    }

    // Resolve titles in parallel
    const [tasks, documents] = await Promise.all([
      taskIds.size > 0
        ? prisma.task.findMany({
            where: { id: { in: Array.from(taskIds) }, workspaceId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      documentIds.size > 0
        ? prisma.document.findMany({
            where: { id: { in: Array.from(documentIds) }, workspaceId },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
    ]);

    const taskTitleMap = new Map(tasks.map((t) => [t.id, t.title]));
    const documentTitleMap = new Map(documents.map((d) => [d.id, d.title]));

    function resolveTitle(type: string, id: string): string {
      if (type === "TASK") return taskTitleMap.get(id) ?? "Untitled task";
      if (type === "DOCUMENT") return documentTitleMap.get(id) ?? "Untitled document";
      return "Unknown";
    }

    const linked: LinkedEntity[] = [
      ...outgoing.map((rel) => ({
        relationshipId: rel.id,
        relationshipType: rel.relationshipType,
        direction: "outgoing" as const,
        entityType: rel.targetEntityType as "TASK" | "DOCUMENT",
        entityId: rel.targetEntityId,
        title: resolveTitle(rel.targetEntityType, rel.targetEntityId),
      })),
      ...incoming.map((rel) => ({
        relationshipId: rel.id,
        relationshipType: rel.relationshipType,
        direction: "incoming" as const,
        entityType: rel.sourceEntityType as "TASK" | "DOCUMENT",
        entityId: rel.sourceEntityId,
        title: resolveTitle(rel.sourceEntityType, rel.sourceEntityId),
      })),
    ];

    // Deduplicate by entityType + entityId (keep first occurrence)
    const seen = new Set<string>();
    const deduped = linked.filter((item) => {
      const key = `${item.entityType}:${item.entityId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ success: true, data: deduped });
  } catch (error) {
    console.error("Relationships GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch relationships" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await context.params;

    const access = await requireWorkspaceAccess(workspaceId);
    if ("error" in access) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }

    const body = await req.json();

    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 },
      );
    }

    const relationship = await createRelationship({
      ...parsed.data,
      workspaceId,
    });

    return NextResponse.json({
      success: true,
      data: relationship,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create relationship",
      },
      { status: 500 },
    );
  }
}
