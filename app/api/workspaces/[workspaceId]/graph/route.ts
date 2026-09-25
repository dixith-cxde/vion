import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { resolveEntityLabels } from "@/lib/services/entity-resolve.service";
import { getEntityHref } from "@/lib/entities/mention";

type GraphNode = {
  id: string;
  type: string;
  entityType: string;
  entityId: string;
  data: {
    label: string;
    href: string;
    degree: number;
    recentActivityCount: number;
  };
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  createdAt: string;
  recent: boolean;
};

export async function GET(
  _req: Request,
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

    const relationships = await prisma.relationship.findMany({
      where: {
        workspaceId,
      },
    });

    // Resolve labels (CRITICAL FIX)
    const resolved = await resolveEntityLabels(relationships);

    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const degrees = new Map<string, number>();
    const recentActivityCounts = new Map<string, number>();
    const recentWindow = Date.now() - 1000 * 60 * 60 * 72;

    for (const rel of resolved) {
      const sourceKey = `${rel.sourceEntityType}-${rel.sourceEntityId}`;
      const targetKey = `${rel.targetEntityType}-${rel.targetEntityId}`;
      const isRecent = new Date(rel.createdAt).getTime() >= recentWindow;

      degrees.set(sourceKey, (degrees.get(sourceKey) ?? 0) + 1);
      degrees.set(targetKey, (degrees.get(targetKey) ?? 0) + 1);

      if (isRecent) {
        recentActivityCounts.set(sourceKey, (recentActivityCounts.get(sourceKey) ?? 0) + 1);
        recentActivityCounts.set(targetKey, (recentActivityCounts.get(targetKey) ?? 0) + 1);
      }

      if (!nodesMap.has(sourceKey)) {
        nodesMap.set(sourceKey, {
          id: sourceKey,
          type: rel.sourceEntityType,
          entityType: rel.sourceEntityType,
          entityId: rel.sourceEntityId,
          data: {
            label: rel.sourceLabel || rel.sourceEntityType,
            href: getEntityHref(workspaceId, rel.sourceEntityType as never, rel.sourceEntityId),
            degree: 0,
            recentActivityCount: 0,
          },
        });
      }

      if (!nodesMap.has(targetKey)) {
        nodesMap.set(targetKey, {
          id: targetKey,
          type: rel.targetEntityType,
          entityType: rel.targetEntityType,
          entityId: rel.targetEntityId,
          data: {
            label: rel.targetLabel || rel.targetEntityType,
            href: getEntityHref(workspaceId, rel.targetEntityType as never, rel.targetEntityId),
            degree: 0,
            recentActivityCount: 0,
          },
        });
      }

      edges.push({
        id: rel.id,
        source: sourceKey,
        target: targetKey,
        label: rel.relationshipType,
        createdAt: rel.createdAt.toISOString(),
        recent: isRecent,
      });
    }

    for (const [key, node] of nodesMap) {
      node.data.degree = degrees.get(key) ?? 0;
      node.data.recentActivityCount = recentActivityCounts.get(key) ?? 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        nodes: Array.from(nodesMap.values()),
        edges,
        meta: {
          relationshipTypes: Array.from(new Set(edges.map((edge) => edge.label))).sort(),
          entityTypes: Array.from(new Set(Array.from(nodesMap.values()).map((node) => node.type))).sort(),
          generatedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err instanceof Error && err.message === "FORBIDDEN") {
      return new Response("Forbidden", { status: 403 });
    }

    console.error("Graph API error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to build graph",
      },
      { status: 500 },
    );
  }
}
