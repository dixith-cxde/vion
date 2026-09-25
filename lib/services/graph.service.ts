import { prisma } from "@/lib/prisma";
import { resolveEntityLabels } from "./entity-resolve.service";

type GraphNode = {
  id: string;
  type: string;
  label: string;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export async function getWorkspaceGraph(workspaceId: string) {
  const relationships = await prisma.relationship.findMany({
    where: { workspaceId },
  });

  // Resolve labels using same system as dashboard
  const resolved = await resolveEntityLabels(relationships);

  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  resolved.forEach((rel) => {
    const sourceKey = `${rel.sourceEntityType}-${rel.sourceEntityId}`;
    const targetKey = `${rel.targetEntityType}-${rel.targetEntityId}`;

    // SOURCE NODE
    if (!nodesMap.has(sourceKey)) {
      nodesMap.set(sourceKey, {
        id: sourceKey,
        type: rel.sourceEntityType,
        label: rel.sourceLabel || rel.sourceEntityType,
      });
    }

    // TARGET NODE
    if (!nodesMap.has(targetKey)) {
      nodesMap.set(targetKey, {
        id: targetKey,
        type: rel.targetEntityType,
        label: rel.targetLabel || rel.targetEntityType,
      });
    }

    // EDGE
    edges.push({
      id: rel.id,
      source: sourceKey,
      target: targetKey,
      label: rel.relationshipType,
    });
  });

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}
