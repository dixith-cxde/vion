"use client";

import { cn } from "@/lib/utils";
import { ENTITY_LABEL, type EntityType } from "@/lib/constants";

import { formatToken } from "./graph-layout";
import { NODE_HEIGHT, NODE_WIDTH, getEntityTone } from "./graph-theme";
import type { GraphNode, Point } from "./graph-types";

type GraphNodeCardProps = {
  node: GraphNode;
  point: Point;
  isSelected: boolean;
  isMuted: boolean;
  recentActivityCount: number;
  onSelect: (id: string) => void;
};

export function GraphNodeCard({
  node,
  point,
  isSelected,
  isMuted,
  recentActivityCount,
  onSelect,
}: GraphNodeCardProps) {
  const tone = getEntityTone(node.entityType);

  return (
    <button
      type="button"
      data-graph-node="true"
      onClick={() => onSelect(node.id)}
      className={cn(
        "absolute flex flex-col items-start rounded-lg border bg-white/96 px-3 py-2 text-left shadow-none transition",
        tone.bg,
        tone.border,
        isSelected && "ring-2 ring-slate-900/10",
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
        <div className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", tone.text)}>
          {ENTITY_LABEL[node.entityType as EntityType] ?? formatToken(node.entityType)}
        </div>
        {recentActivityCount > 0 ? (
          <div className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
            {recentActivityCount}
          </div>
        ) : null}
      </div>
      <div className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-slate-900">
        {node.data.label}
      </div>
    </button>
  );
}
