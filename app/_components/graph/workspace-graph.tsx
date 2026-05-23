"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Focus,
  Grip,
  Loader2,
  Network,
  RefreshCw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ENTITY_COLOR,
  ENTITY_LABEL,
  RELATIONSHIP_LABEL,
  type EntityType,
  type RelationshipType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

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

type GraphResponse = {
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

type WorkspaceGraphProps = {
  workspaceId: string;
  initialEntityId?: string;
  initialEntityType?: string;
};

type Point = { x: number; y: number };

type ClusterBounds = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
};

type LayoutResult = {
  positions: Map<string, Point>;
  clusters: ClusterBounds[];
  width: number;
  height: number;
};

type DragState = {
  pointerX: number;
  pointerY: number;
  scrollLeft: number;
  scrollTop: number;
};

const NODE_WIDTH = 164;
const NODE_HEIGHT = 60;
const CLUSTER_PADDING = 52;
const CLUSTER_GAP = 96;
const GRAPH_PADDING = 96;
const MIN_SCALE = 0.56;
const MAX_SCALE = 1.22;

export function WorkspaceGraph({
  workspaceId,
  initialEntityId,
  initialEntityType,
}: WorkspaceGraphProps) {
  const router = useRouter();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const autoFitDoneRef = useRef(false);
  const dragStateRef = useRef<DragState | null>(null);

  const [payload, setPayload] = useState<GraphResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [activeRelationships, setActiveRelationships] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState(Boolean(initialEntityId && initialEntityType));
  const [recentOnly, setRecentOnly] = useState(false);
  const [scale, setScale] = useState(0.94);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const loadGraph = useCallback(async () => {
    setIsLoading(true);
    autoFitDoneRef.current = false;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/graph`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load graph");
      }

      const nextPayload = (await response.json()) as GraphResponse;
      setPayload(nextPayload.data);

      setActiveTypes((current) => {
        const nextTypes = nextPayload.data.meta.entityTypes;
        if (current.length === 0) {
          return nextTypes;
        }

        const allowed = current.filter((type) => nextTypes.includes(type));
        return allowed.length > 0 ? allowed : nextTypes;
      });

      setActiveRelationships((current) => {
        const nextRelationships = nextPayload.data.meta.relationshipTypes;
        if (current.length === 0) {
          return nextRelationships;
        }

        const allowed = current.filter((type) => nextRelationships.includes(type));
        return allowed.length > 0 ? allowed : nextRelationships;
      });

      if (initialEntityId && initialEntityType) {
        const initialNode = nextPayload.data.nodes.find(
          (node) => node.entityId === initialEntityId && node.entityType === initialEntityType
        );
        setSelectedNodeId(initialNode?.id ?? null);
      }
    } catch (error) {
      console.error("GRAPH_LOAD_ERROR", error);
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }, [initialEntityId, initialEntityType, workspaceId]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadGraph();
    });
  }, [loadGraph]);

  useEffect(() => {
    const element = viewportRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setViewportSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const nodeMap = useMemo(
    () => new Map(payload?.nodes.map((node) => [node.id, node]) ?? []),
    [payload?.nodes]
  );

  const visibleEdges = useMemo(() => {
    if (!payload) {
      return [];
    }

    return payload.edges.filter((edge) => {
      if (!activeRelationships.includes(edge.label)) {
        return false;
      }

      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);

      if (!source || !target) {
        return false;
      }

      if (!activeTypes.includes(source.entityType) || !activeTypes.includes(target.entityType)) {
        return false;
      }

      if (recentOnly && !edge.recent) {
        return false;
      }

      return true;
    });
  }, [activeRelationships, activeTypes, nodeMap, payload, recentOnly]);

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const edge of visibleEdges) {
      map.set(edge.source, new Set([...(map.get(edge.source) ?? []), edge.target]));
      map.set(edge.target, new Set([...(map.get(edge.target) ?? []), edge.source]));
    }

    return map;
  }, [visibleEdges]);

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();

    for (const edge of visibleEdges) {
      ids.add(edge.source);
      ids.add(edge.target);
    }

    for (const node of payload?.nodes ?? []) {
      if (activeTypes.includes(node.entityType)) {
        ids.add(node.id);
      }
    }

    return ids;
  }, [activeTypes, payload?.nodes, visibleEdges]);

  const searchableNodes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (payload?.nodes ?? []).filter((node) => {
      if (!visibleNodeIds.has(node.id)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [node.data.label, node.entityType, node.entityId].some((value) =>
        value.toLowerCase().includes(query)
      );
    });
  }, [payload?.nodes, search, visibleNodeIds]);

  const selectedNeighborhood = useMemo(() => {
    if (!selectedNodeId) {
      return new Set<string>();
    }

    return new Set([selectedNodeId, ...(neighborMap.get(selectedNodeId) ?? [])]);
  }, [neighborMap, selectedNodeId]);

  const filteredNodes = useMemo(() => {
    if (!focusMode || selectedNeighborhood.size === 0) {
      return searchableNodes;
    }

    return searchableNodes.filter((node) => selectedNeighborhood.has(node.id));
  }, [focusMode, searchableNodes, selectedNeighborhood]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(
    () =>
      visibleEdges.filter((edge) => {
        if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) {
          return false;
        }

        if (!focusMode || selectedNeighborhood.size === 0 || !selectedNodeId) {
          return true;
        }

        return edge.source === selectedNodeId || edge.target === selectedNodeId;
      }),
    [filteredNodeIds, focusMode, selectedNeighborhood.size, selectedNodeId, visibleEdges]
  );

  const selectedNode = selectedNodeId ? (nodeMap.get(selectedNodeId) ?? null) : null;

  const selectedConnections = useMemo(() => {
    if (!selectedNodeId) {
      return [];
    }

    return filteredEdges.filter(
      (edge) => edge.source === selectedNodeId || edge.target === selectedNodeId
    );
  }, [filteredEdges, selectedNodeId]);

  const layout = useMemo(
    () =>
      buildClusteredLayout(
        filteredNodes,
        filteredEdges,
        payload?.meta.entityTypes ?? [],
        selectedNodeId
      ),
    [filteredEdges, filteredNodes, payload?.meta.entityTypes, selectedNodeId]
  );

  const centerGraph = useCallback(
    (nextScale: number) => {
      const viewport = viewportRef.current;

      if (!viewport || !layout.width || !layout.height) {
        return;
      }

      requestAnimationFrame(() => {
        const scaledWidth = layout.width * nextScale;
        const scaledHeight = layout.height * nextScale;

        viewport.scrollTo({
          left: Math.max(0, (scaledWidth - viewport.clientWidth) / 2),
          top: Math.max(0, (scaledHeight - viewport.clientHeight) / 2),
        });
      });
    },
    [layout.height, layout.width]
  );

  const fitGraph = useCallback(() => {
    if (!viewportSize.width || !viewportSize.height || !layout.width || !layout.height) {
      return;
    }

    const nextScale = clamp(
      Math.min(
        (viewportSize.width - 96) / layout.width,
        (viewportSize.height - 96) / layout.height
      ),
      MIN_SCALE,
      1
    );

    setScale(nextScale);
    centerGraph(nextScale);
  }, [centerGraph, layout.height, layout.width, viewportSize.height, viewportSize.width]);

  useEffect(() => {
    if (autoFitDoneRef.current || isLoading || filteredNodes.length === 0) {
      return;
    }

    fitGraph();
    autoFitDoneRef.current = true;
  }, [filteredNodes.length, fitGraph, isLoading]);

  function toggleItem(list: string[], value: string) {
    return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-graph-node='true']")) {
      return;
    }

    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    dragStateRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const viewport = viewportRef.current;
    const dragState = dragStateRef.current;

    if (!viewport || !dragState) {
      return;
    }

    viewport.scrollLeft = dragState.scrollLeft - (event.clientX - dragState.pointerX);
    viewport.scrollTop = dragState.scrollTop - (event.clientY - dragState.pointerY);
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center gap-3">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Building workspace graph...</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6">
        <Card className="max-w-md border-0 shadow-none">
          <CardHeader>
            <CardTitle>Graph unavailable</CardTitle>
            <CardDescription>The workspace graph could not be loaded.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void loadGraph()}>
              <RefreshCw className="size-4" />
              Reload graph
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col bg-background">
      <div className="border-b border-border/60 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Graph</h1>
            <p className="text-sm text-muted-foreground">
              Compact workspace map with clustered entities and direct relationship flow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale((value) => clamp(value - 0.08, MIN_SCALE, MAX_SCALE))}
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScale((value) => clamp(value + 0.08, MIN_SCALE, MAX_SCALE))}
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={fitGraph}>
              <Focus className="size-4" />
              Fit view
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadGraph()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search nodes by title, type, or id"
              className="rounded-lg border-0 bg-white/80 pl-9 ring-1 ring-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <FilterPopover
              label="Entity types"
              count={activeTypes.length}
              total={payload.meta.entityTypes.length}
            >
              {payload.meta.entityTypes.map((type) => (
                <FilterCheckboxRow
                  key={type}
                  checked={activeTypes.includes(type)}
                  label={ENTITY_LABEL[type as EntityType] ?? formatToken(type)}
                  onCheckedChange={() => setActiveTypes((current) => toggleItem(current, type))}
                />
              ))}
            </FilterPopover>

            <FilterPopover
              label="Relationships"
              count={activeRelationships.length}
              total={payload.meta.relationshipTypes.length}
            >
              {payload.meta.relationshipTypes.map((type) => (
                <FilterCheckboxRow
                  key={type}
                  checked={activeRelationships.includes(type)}
                  label={RELATIONSHIP_LABEL[type as RelationshipType] ?? formatToken(type)}
                  onCheckedChange={() =>
                    setActiveRelationships((current) => toggleItem(current, type))
                  }
                />
              ))}
            </FilterPopover>

            <div className="flex items-center gap-2 border-l border-violet-200 pl-3">
              <Switch
                id="graph-focus-mode"
                checked={focusMode}
                onCheckedChange={setFocusMode}
                size="sm"
              />
              <Label htmlFor="graph-focus-mode" className="text-xs font-medium text-foreground">
                Focus mode
              </Label>
            </div>

            <div className="flex items-center gap-2 border-l border-sky-200 pl-3">
              <Switch
                id="graph-recent-only"
                checked={recentOnly}
                onCheckedChange={setRecentOnly}
                size="sm"
              />
              <Label htmlFor="graph-recent-only" className="text-xs font-medium text-foreground">
                Recent only
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-h-0 border-r border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Network className="size-4" />
              <span>
                {filteredNodes.length} visible nodes · {filteredEdges.length} visible edges
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Grip className="size-3.5" />
              Scroll or drag to pan
            </div>
          </div>

          <div
            ref={viewportRef}
            className="h-full overflow-auto bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px),radial-gradient(circle_at_top,rgba(241,245,249,0.9),rgba(255,255,255,0.96)_35%,rgba(255,255,255,1)_100%)] [background-size:28px_28px,28px_28px,100%_100%]"
          >
            {filteredNodes.length === 0 ? (
              <div className="flex min-h-full w-full items-center justify-center p-8">
                <div className="w-full max-w-2xl border-t border-slate-200 pt-6 text-center">
                  <h2 className="text-base font-semibold text-slate-900">
                    No nodes match the current graph view
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Adjust search, focus mode, or filters to bring entities back into the canvas.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="relative min-h-full min-w-full p-8"
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerCancel={handleCanvasPointerUp}
              >
                <div
                  className="relative"
                  style={{
                    width: Math.max(layout.width * scale, viewportSize.width - 64),
                    height: Math.max(layout.height * scale, viewportSize.height - 64),
                  }}
                >
                  <div
                    className="absolute left-0 top-0 origin-top-left"
                    style={{
                      width: layout.width,
                      height: layout.height,
                      transform: `scale(${scale})`,
                    }}
                  >
                    <svg
                      className="absolute inset-0 overflow-visible"
                      width={layout.width}
                      height={layout.height}
                      viewBox={`0 0 ${layout.width} ${layout.height}`}
                      fill="none"
                    >
                      <defs>
                        <marker
                          id="graph-arrowhead"
                          markerWidth="9"
                          markerHeight="9"
                          refX="7"
                          refY="4.5"
                          orient="auto"
                        >
                          <path d="M0 0L9 4.5L0 9Z" fill="rgba(100, 116, 139, 0.75)" />
                        </marker>
                      </defs>

                      {layout.clusters.map((cluster) => {
                        const tone = getEntityTone(cluster.type);

                        return (
                          <g key={cluster.type}>
                            <rect
                              x={cluster.x}
                              y={cluster.y}
                              width={cluster.width}
                              height={cluster.height}
                              rx={18}
                              fill={tone.clusterFill}
                              stroke={tone.clusterStroke}
                              strokeDasharray="6 8"
                            />
                            <text
                              x={cluster.x + 18}
                              y={cluster.y + 24}
                              fill={tone.clusterLabel}
                              fontSize="12"
                              fontWeight="600"
                            >
                              {ENTITY_LABEL[cluster.type as EntityType] ??
                                formatToken(cluster.type)}
                            </text>
                          </g>
                        );
                      })}

                      {filteredEdges.map((edge) => {
                        const source = layout.positions.get(edge.source);
                        const target = layout.positions.get(edge.target);

                        if (!source || !target) {
                          return null;
                        }

                        const path = buildEdgePath(source, target);
                        const isSelected =
                          edge.source === selectedNodeId || edge.target === selectedNodeId;
                        const midPoint = getCurveMidpoint(source, target);

                        return (
                          <g key={edge.id}>
                            <path
                              d={path}
                              stroke={
                                isSelected ? "rgba(15, 23, 42, 0.7)" : "rgba(100, 116, 139, 0.32)"
                              }
                              strokeWidth={isSelected ? 2.4 : 1.35}
                              markerEnd="url(#graph-arrowhead)"
                              fill="none"
                            />
                            {(isSelected || filteredEdges.length <= 18) && edge.label ? (
                              <g>
                                <rect
                                  x={midPoint.x - 42}
                                  y={midPoint.y - 10}
                                  width={84}
                                  height={20}
                                  rx={10}
                                  fill="rgba(255,255,255,0.92)"
                                  stroke="rgba(148,163,184,0.24)"
                                />
                                <text
                                  x={midPoint.x}
                                  y={midPoint.y + 4}
                                  textAnchor="middle"
                                  fill="rgba(71,85,105,0.88)"
                                  fontSize="10.5"
                                  fontWeight="600"
                                >
                                  {truncateLabel(
                                    RELATIONSHIP_LABEL[edge.label as RelationshipType] ??
                                      formatToken(edge.label),
                                    16
                                  )}
                                </text>
                              </g>
                            ) : null}
                          </g>
                        );
                      })}
                    </svg>

                    {filteredNodes.map((node) => {
                      const point = layout.positions.get(node.id);

                      if (!point) {
                        return null;
                      }

                      const tone = getEntityTone(node.entityType);
                      const isSelected = node.id === selectedNodeId;
                      const isNeighbor = selectedNeighborhood.has(node.id);
                      const isMuted =
                        selectedNeighborhood.size > 0 && !isNeighbor && !isSelected && focusMode;

                      return (
                        <button
                          key={node.id}
                          type="button"
                          data-graph-node="true"
                          onClick={() => setSelectedNodeId(node.id)}
                          className={cn(
                            "absolute flex flex-col items-start rounded-lg border bg-white/96 px-3 py-2 text-left shadow-none transition",
                            tone.bg,
                            tone.border,
                            isSelected &&
                              "ring-2 ring-slate-900/10",
                            isMuted && "opacity-35"
                          )}
                          style={{
                            left: point.x,
                            top: point.y,
                            width: NODE_WIDTH,
                            height: NODE_HEIGHT,
                          }}
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <div
                              className={cn(
                                "text-[10px] font-semibold uppercase tracking-[0.14em]",
                                tone.text
                              )}
                            >
                              {ENTITY_LABEL[node.entityType as EntityType] ??
                                formatToken(node.entityType)}
                            </div>
                            {node.data.recentActivityCount > 0 ? (
                              <div className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                {node.data.recentActivityCount}
                              </div>
                            ) : null}
                          </div>
                          <div className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-900">
                            {node.data.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="m-4 hidden min-h-0 border-l border-border/60 xl:flex xl:flex-col">
          <div className="px-6 pb-4">
            <h2 className="text-base font-semibold text-slate-900">Inspector</h2>
            <p className="mt-1 text-sm text-slate-500">
              {selectedNode
                ? "Selected node details and immediate relationship context."
                : "Select a node to inspect it."}
            </p>
          </div>
          <div className="min-h-0 flex-1 px-0 pb-0">
            {selectedNode ? (
              <ScrollArea className="h-full px-6 pb-6">
                <div className="space-y-5">
                  <div
                    className={cn(
                      "border-l p-4",
                      getEntityTone(selectedNode.entityType).bg,
                      getEntityTone(selectedNode.entityType).border
                    )}
                  >
                    <div
                      className={cn(
                        "text-[11px] font-semibold uppercase tracking-[0.18em]",
                        getEntityTone(selectedNode.entityType).text
                      )}
                    >
                      {ENTITY_LABEL[selectedNode.entityType as EntityType] ??
                        formatToken(selectedNode.entityType)}
                    </div>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">
                      {selectedNode.data.label}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedNode.entityId}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(selectedNode.data.href)}
                      >
                        Open entity
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricTile label="Degree" value={String(selectedNode.data.degree)} />
                    <MetricTile
                      label="Recent activity"
                      value={String(selectedNode.data.recentActivityCount)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Connected edges</h3>
                      <p className="text-xs text-muted-foreground">
                        Immediate relationships from the current focus node.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {selectedConnections.length > 0 ? (
                        selectedConnections.map((edge) => {
                          const peerId =
                            edge.source === selectedNode.id ? edge.target : edge.source;
                          const peer = nodeMap.get(peerId);

                          if (!peer) {
                            return null;
                          }

                          const peerTone = getEntityTone(peer.entityType);

                          return (
                            <button
                              key={edge.id}
                              type="button"
                              onClick={() => setSelectedNodeId(peer.id)}
                              className="w-full border-b border-border/60 px-0 py-3 text-left transition hover:bg-muted/20"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div
                                    className={cn(
                                      "text-[10px] font-semibold uppercase tracking-[0.14em]",
                                      peerTone.text
                                    )}
                                  >
                                    {RELATIONSHIP_LABEL[edge.label as RelationshipType] ??
                                      formatToken(edge.label)}
                                  </div>
                                  <div className="mt-1 line-clamp-2 text-sm font-medium text-foreground">
                                    {peer.data.label}
                                  </div>
                                </div>
                                <div
                                  className={cn(
                                    "rounded-full px-2 py-1 text-[10px] font-medium",
                                    peerTone.bg,
                                    peerTone.text
                                  )}
                                >
                                  {ENTITY_LABEL[peer.entityType as EntityType] ??
                                    formatToken(peer.entityType)}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No visible relationships for this node.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="px-6 pb-6 text-sm text-muted-foreground">
                Select a node to inspect its linked entities and open the source item.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterPopover({
  label,
  count,
  total,
  children,
}: {
  label: string;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg border-0 bg-white/80 shadow-none ring-1 ring-slate-200">
          {label}
          <span className="text-xs text-muted-foreground">
            {count}/{total}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-lg border-0 p-0 shadow-none ring-1 ring-slate-200">
        <PopoverHeader className="border-b border-border/60 px-4 py-4">
          <PopoverTitle>{label}</PopoverTitle>
          <PopoverDescription>Refine what stays visible in the graph.</PopoverDescription>
        </PopoverHeader>
        <div className="max-h-72 space-y-1 overflow-auto p-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

function FilterCheckboxRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-muted/35">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-slate-200 pl-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function buildClusteredLayout(
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

function buildEdgePath(source: Point, target: Point) {
  const sourceX = source.x + NODE_WIDTH / 2;
  const sourceY = source.y + NODE_HEIGHT / 2;
  const targetX = target.x + NODE_WIDTH / 2;
  const targetY = target.y + NODE_HEIGHT / 2;
  const dx = targetX - sourceX;
  const controlOffset = Math.max(52, Math.abs(dx) * 0.4);

  return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;
}

function getCurveMidpoint(source: Point, target: Point) {
  return {
    x: (source.x + target.x) / 2 + NODE_WIDTH / 2,
    y: (source.y + target.y) / 2 + NODE_HEIGHT / 2,
  };
}

function getNodeJitter(input: string) {
  const hash = [...input].reduce(
    (accumulator, character) => accumulator + character.charCodeAt(0),
    0
  );

  return {
    x: (hash % 7) - 3,
    y: ((hash >> 2) % 7) - 3,
  };
}

function getEntityTone(type: string) {
  const tone = ENTITY_COLOR[type as EntityType];

  if (!tone) {
    return {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      clusterFill: "rgba(248,250,252,0.8)",
      clusterStroke: "rgba(203,213,225,0.8)",
      clusterLabel: "rgba(71,85,105,0.92)",
    };
  }

  const clusterMap: Record<string, { fill: string; stroke: string; label: string }> = {
    TASK: {
      fill: "rgba(245,243,255,0.78)",
      stroke: "rgba(196,181,253,0.95)",
      label: "rgba(109,40,217,0.9)",
    },
    DOCUMENT: {
      fill: "rgba(240,249,255,0.82)",
      stroke: "rgba(125,211,252,0.95)",
      label: "rgba(3,105,161,0.88)",
    },
    MESSAGE: {
      fill: "rgba(255,251,235,0.88)",
      stroke: "rgba(252,211,77,0.95)",
      label: "rgba(180,83,9,0.9)",
    },
    COMMIT: {
      fill: "rgba(236,253,245,0.86)",
      stroke: "rgba(110,231,183,0.95)",
      label: "rgba(5,150,105,0.9)",
    },
    CHANNEL: {
      fill: "rgba(255,241,242,0.82)",
      stroke: "rgba(253,164,175,0.95)",
      label: "rgba(190,24,93,0.88)",
    },
    USER: {
      fill: "rgba(248,250,252,0.92)",
      stroke: "rgba(203,213,225,0.95)",
      label: "rgba(71,85,105,0.88)",
    },
  };

  const clusterTone = clusterMap[type] ?? clusterMap.USER;

  return {
    ...tone,
    clusterFill: clusterTone.fill,
    clusterStroke: clusterTone.stroke,
    clusterLabel: clusterTone.label,
  };
}

function formatToken(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function truncateLabel(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, Math.max(0, length - 3))}...`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
