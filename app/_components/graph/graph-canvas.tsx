"use client";

import { useRef } from "react";
import { Grip, Network } from "lucide-react";

import {
  ENTITY_LABEL,
  RELATIONSHIP_LABEL,
  type EntityType,
  type RelationshipType,
} from "@/lib/constants";

import { buildEdgePath, formatToken, getCurveMidpoint, truncateLabel } from "./graph-layout";
import { getEntityTone } from "./graph-theme";
import { GraphNodeCard } from "./graph-node";
import type { DragState, GraphEdge, GraphNode, LayoutResult } from "./graph-types";

type GraphCanvasProps = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  filteredNodes: GraphNode[];
  filteredEdges: GraphEdge[];
  layout: LayoutResult;
  scale: number;
  viewportSize: { width: number; height: number };
  selectedNodeId: string | null;
  selectedNeighborhood: Set<string>;
  focusMode: boolean;
  onSelectNode: (id: string) => void;
};

export function GraphCanvas({
  viewportRef,
  filteredNodes,
  filteredEdges,
  layout,
  scale,
  viewportSize,
  selectedNodeId,
  selectedNeighborhood,
  focusMode,
  onSelectNode,
}: GraphCanvasProps) {
  const dragStateRef = useRef<DragState | null>(null);

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

  return (
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
                          {ENTITY_LABEL[cluster.type as EntityType] ?? formatToken(cluster.type)}
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

                  const isSelected = node.id === selectedNodeId;
                  const isNeighbor = selectedNeighborhood.has(node.id);

                  return (
                    <GraphNodeCard
                      key={node.id}
                      node={node}
                      point={point}
                      isSelected={isSelected}
                      isMuted={
                        selectedNeighborhood.size > 0 && !isNeighbor && !isSelected && focusMode
                      }
                      recentActivityCount={node.data.recentActivityCount}
                      onSelect={onSelectNode}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
