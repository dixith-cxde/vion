"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ENTITY_LABEL,
  RELATIONSHIP_LABEL,
  type EntityType,
  type RelationshipType,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

import { MetricTile } from "./graph-filters";
import { formatToken } from "./graph-layout";
import { getEntityTone } from "./graph-theme";
import type { GraphEdge, GraphNode } from "./graph-types";

type GraphInspectorProps = {
  selectedNode: GraphNode | null;
  selectedConnections: GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  onSelectNode: (id: string) => void;
};

export function GraphInspector({
  selectedNode,
  selectedConnections,
  nodeMap,
  onSelectNode,
}: GraphInspectorProps) {
  const router = useRouter();

  return (
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
                      const peerId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const peer = nodeMap.get(peerId);

                      if (!peer) {
                        return null;
                      }

                      const peerTone = getEntityTone(peer.entityType);

                      return (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => onSelectNode(peer.id)}
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
  );
}
