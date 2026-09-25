"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { clamp } from "./graph-layout";
import { MAX_SCALE, MIN_SCALE } from "./graph-theme";
import type { GraphResponse, WorkspaceGraphProps } from "./graph-types";

import { GraphCanvas } from "./graph-canvas";
import { GraphInspector } from "./graph-inspector";
import { useGraphModel } from "./graph-model";
import { GraphToolbar, toggleGraphItem } from "./graph-toolbar";

export type { GraphResponse, WorkspaceGraphProps } from "./graph-types";

export function WorkspaceGraph({
  workspaceId,
  initialEntityId,
  initialEntityType,
}: WorkspaceGraphProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const autoFitDoneRef = useRef(false);

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

  const {
    nodeMap,
    filteredNodes,
    filteredEdges,
    selectedNode,
    selectedConnections,
    selectedNeighborhood,
    layout,
  } = useGraphModel({
    payload,
    search,
    activeTypes,
    activeRelationships,
    selectedNodeId,
    focusMode,
    recentOnly,
  });

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
      <GraphToolbar
        payload={payload}
        search={search}
        onSearchChange={setSearch}
        activeTypes={activeTypes}
        onToggleType={(type) => setActiveTypes((current) => toggleGraphItem(current, type))}
        activeRelationships={activeRelationships}
        onToggleRelationship={(type) =>
          setActiveRelationships((current) => toggleGraphItem(current, type))
        }
        focusMode={focusMode}
        onFocusModeChange={setFocusMode}
        recentOnly={recentOnly}
        onRecentOnlyChange={setRecentOnly}
        onZoomOut={() => setScale((value) => clamp(value - 0.08, MIN_SCALE, MAX_SCALE))}
        onZoomIn={() => setScale((value) => clamp(value + 0.08, MIN_SCALE, MAX_SCALE))}
        onFitView={fitGraph}
        onRefresh={() => void loadGraph()}
      />

      <div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <GraphCanvas
          viewportRef={viewportRef}
          filteredNodes={filteredNodes}
          filteredEdges={filteredEdges}
          layout={layout}
          scale={scale}
          viewportSize={viewportSize}
          selectedNodeId={selectedNodeId}
          selectedNeighborhood={selectedNeighborhood}
          focusMode={focusMode}
          onSelectNode={setSelectedNodeId}
        />

        <GraphInspector
          selectedNode={selectedNode}
          selectedConnections={selectedConnections}
          nodeMap={nodeMap}
          onSelectNode={setSelectedNodeId}
        />
      </div>
    </div>
  );
}
