import {
  CLUSTER_GAP,
  CLUSTER_PADDING,
  GRAPH_PADDING,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "./graph-theme";
import type { ClusterBounds, GraphEdge, GraphNode, LayoutResult, Point } from "./graph-types";

export function buildClusteredLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  typeOrder: string[],
  selectedNodeId: string | null
): LayoutResult {
  if (nodes.length === 0) {
    return {
      positions: new Map(),
      clusters: [],
      width: 0,
      height: 0,
    };
  }

  const adjacency = new Map<string, number>();
  for (const edge of edges) {
    adjacency.set(edge.source, (adjacency.get(edge.source) ?? 0) + 1);
    adjacency.set(edge.target, (adjacency.get(edge.target) ?? 0) + 1);
  }

  const grouped = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    const key = node.entityType;
    grouped.set(key, [...(grouped.get(key) ?? []), node]);
  }

  const orderedTypes = [...grouped.keys()].sort((left, right) => {
    const leftIndex = typeOrder.indexOf(left);
    const rightIndex = typeOrder.indexOf(right);
    if (leftIndex !== -1 && rightIndex !== -1) {
      return leftIndex - rightIndex;
    }
    if (leftIndex !== -1) {
      return -1;
    }
    if (rightIndex !== -1) {
      return 1;
    }
    return left.localeCompare(right);
  });

  const clusterModels = orderedTypes.map((type) => {
    const members = [...(grouped.get(type) ?? [])].sort((left, right) => {
      if (left.id === selectedNodeId) {
        return -1;
      }
      if (right.id === selectedNodeId) {
        return 1;
      }

      const degreeDelta =
        (adjacency.get(right.id) ?? right.data.degree) -
        (adjacency.get(left.id) ?? left.data.degree);
      if (degreeDelta !== 0) {
        return degreeDelta;
      }

      return left.data.label.localeCompare(right.data.label);
    });

    const columnCount = Math.max(2, Math.ceil(Math.sqrt(members.length)));
    const rowCount = Math.max(1, Math.ceil(members.length / columnCount));
    const width =
      columnCount * NODE_WIDTH + Math.max(0, columnCount - 1) * 18 + CLUSTER_PADDING * 2;
    const height =
      rowCount * NODE_HEIGHT + Math.max(0, rowCount - 1) * 18 + CLUSTER_PADDING * 2 + 24;

    return {
      type,
      members,
      width,
      height,
    };
  });

  const positions = new Map<string, Point>();
  const clusters: ClusterBounds[] = [];
  const columns = Math.max(1, Math.ceil(Math.sqrt(clusterModels.length)));

  let cursorX = GRAPH_PADDING;
  let cursorY = GRAPH_PADDING;
  let rowHeight = 0;

  clusterModels.forEach((cluster, index) => {
    if (index > 0 && index % columns === 0) {
      cursorX = GRAPH_PADDING;
      cursorY += rowHeight + CLUSTER_GAP;
      rowHeight = 0;
    }

    const bounds: ClusterBounds = {
      type: cluster.type,
      x: cursorX,
      y: cursorY,
      width: cluster.width,
      height: cluster.height,
      count: cluster.members.length,
    };

    clusters.push(bounds);
    rowHeight = Math.max(rowHeight, cluster.height);

    cluster.members.forEach((node, memberIndex) => {
      const col = memberIndex % Math.max(2, Math.ceil(Math.sqrt(cluster.members.length)));
      const row = Math.floor(
        memberIndex / Math.max(2, Math.ceil(Math.sqrt(cluster.members.length)))
      );
      const offsetX = cursorX + CLUSTER_PADDING + col * (NODE_WIDTH + 18);
      const offsetY = cursorY + CLUSTER_PADDING + 18 + row * (NODE_HEIGHT + 18);
      const jitter = getNodeJitter(node.id);

      positions.set(node.id, {
        x: offsetX + jitter.x,
        y: offsetY + jitter.y,
      });
    });

    cursorX += cluster.width + CLUSTER_GAP;
  });

  const width =
    Math.max(...clusters.map((cluster) => cluster.x + cluster.width), 0) + GRAPH_PADDING;
  const height =
    Math.max(...clusters.map((cluster) => cluster.y + cluster.height), 0) + GRAPH_PADDING;

  return {
    positions,
    clusters,
    width,
    height,
  };
}

export function buildEdgePath(source: Point, target: Point) {
  const sourceX = source.x + NODE_WIDTH / 2;
  const sourceY = source.y + NODE_HEIGHT / 2;
  const targetX = target.x + NODE_WIDTH / 2;
  const targetY = target.y + NODE_HEIGHT / 2;
  const dx = targetX - sourceX;
  const controlOffset = Math.max(52, Math.abs(dx) * 0.4);

  return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;
}

export function getCurveMidpoint(source: Point, target: Point) {
  return {
    x: (source.x + target.x) / 2 + NODE_WIDTH / 2,
    y: (source.y + target.y) / 2 + NODE_HEIGHT / 2,
  };
}

export function getNodeJitter(input: string) {
  const hash = [...input].reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0
  );

  return {
    x: (hash % 7) - 3,
    y: ((hash >> 2) % 7) - 3,
  };
}

export function formatToken(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function truncateLabel(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(0, length - 3))}...`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
