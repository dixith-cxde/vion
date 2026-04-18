import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

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
  { params }: { params: { workspaceId: string } },
) {
  try {
    const { workspaceId } = params;

    await requireWorkspaceAccess(workspaceId);

    const relationships = await prisma.relationship.findMany({
      where: {
        workspaceId,
      },
    });

    const nodesMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    for (const rel of relationships) {
      const sourceKey = `${rel.sourceEntityType}-${rel.sourceEntityId}`;
      const targetKey = `${rel.targetEntityType}-${rel.targetEntityId}`;

      // Source node
      if (!nodesMap.has(sourceKey)) {
        nodesMap.set(sourceKey, {
          id: sourceKey,
          type: rel.sourceEntityType,
          data: {
            label: rel.sourceEntityType,
          },
        });
      }

      // Target node
      if (!nodesMap.has(targetKey)) {
        nodesMap.set(targetKey, {
          id: targetKey,
          type: rel.targetEntityType,
          data: {
            label: rel.targetEntityType,
          },
        });
      }

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
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED") {
      return new Response("Unauthorized", { status: 401 });
    }

    if (err.message === "FORBIDDEN") {
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
