export type GraphNode = {
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

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  createdAt: string;
  recent: boolean;
};

export type GraphResponse = {
  success: boolean;
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    meta: {
      relationshipTypes: string[];
      entityTypes: string[];
      generatedAt: string;
    };
  };
};

export type WorkspaceGraphProps = {
  workspaceId: string;
  initialEntityId?: string;
  initialEntityType?: string;
};

export type Point = { x: number; y: number };

export type ClusterBounds = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
};

export type LayoutResult = {
  positions: Map<string, Point>;
  clusters: ClusterBounds[];
  width: number;
  height: number;
};

export type DragState = {
  pointerX: number;
  pointerY: number;
  scrollLeft: number;
  scrollTop: number;
};
