import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const relationships = await prisma.relationship.findMany();

    const nodesMap = new Map<string, any>();
    const edges: any[] = [];

    relationships.forEach((rel) => {
      const sourceKey = `${rel.sourceEntityType}-${rel.sourceEntityId}`;
      const targetKey = `${rel.targetEntityType}-${rel.targetEntityId}`;

      // Add source node
      if (!nodesMap.has(sourceKey)) {
        nodesMap.set(sourceKey, {
          id: sourceKey,
          type: rel.sourceEntityType,
          data: {
            label: rel.sourceEntityType,
          },
        });
      }

      // Add target node
      if (!nodesMap.has(targetKey)) {
        nodesMap.set(targetKey, {
          id: targetKey,
          type: rel.targetEntityType,
          data: {
            label: rel.targetEntityType,
          },
        });
      }

      // Add edge
      edges.push({
        id: rel.id,
        source: sourceKey,
        target: targetKey,
        label: rel.relationshipType,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        nodes: Array.from(nodesMap.values()),
        edges,
      },
    });
  } catch (err) {
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
