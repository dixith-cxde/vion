import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";
import { resolveEntityLabels } from "@/lib/services/entity-resolve.service";

type GraphNode = {
  id: string;
  type: string;
  data: {
    label: string;
  };
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
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

    const relationships = await prisma.relationship.findMany({
      where: {
        workspaceId,
      },
    });

    // Resolve labels (CRITICAL FIX)
    const resolved = await resolveEntityLabels(relationships);

    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const rel of resolved) {
      const sourceKey = `${rel.sourceEntityType}-${rel.sourceEntityId}`;
      const targetKey = `${rel.targetEntityType}-${rel.targetEntityId}`;

      // SOURCE NODE
      if (!nodesMap.has(sourceKey)) {
        nodesMap.set(sourceKey, {
          id: sourceKey,
          type: rel.sourceEntityType,
          data: {
            label: rel.sourceLabel || rel.sourceEntityType,
          },
        });
      }

      // TARGET NODE
      if (!nodesMap.has(targetKey)) {
        nodesMap.set(targetKey, {
          id: targetKey,
          type: rel.targetEntityType,
          data: {
            label: rel.targetLabel || rel.targetEntityType,
          },
        });
      }

      // EDGE
      edges.push({
        id: rel.id,
        source: sourceKey,
        target: targetKey,
        label: rel.relationshipType,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        nodes: Array.from(nodesMap.values()),
        edges,
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
