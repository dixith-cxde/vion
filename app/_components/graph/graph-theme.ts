import { ENTITY_COLOR, type EntityType } from "@/lib/constants";

export const NODE_WIDTH = 164;
export const NODE_HEIGHT = 60;
export const CLUSTER_PADDING = 52;
export const CLUSTER_GAP = 96;
export const GRAPH_PADDING = 96;
export const MIN_SCALE = 0.56;
export const MAX_SCALE = 1.22;

export type EntityTone = {
  bg: string;
  text: string;
  border: string;
  clusterFill: string;
  clusterStroke: string;
  clusterLabel: string;
};

const CLUSTER_TONE: Record<string, { fill: string; stroke: string; label: string }> = {
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

const FALLBACK_TONE: EntityTone = {
  bg: "bg-slate-50",
  text: "text-slate-600",
  border: "border-slate-200",
  clusterFill: "rgba(248,250,252,0.8)",
  clusterStroke: "rgba(203,213,225,0.8)",
  clusterLabel: "rgba(71,85,105,0.92)",
};

export function getEntityTone(type: string): EntityTone {
  const tone = ENTITY_COLOR[type as EntityType];

  if (!tone) {
    return FALLBACK_TONE;
  }

  const clusterTone = CLUSTER_TONE[type] ?? CLUSTER_TONE.USER;

  return {
    ...tone,
    clusterFill: clusterTone.fill,
    clusterStroke: clusterTone.stroke,
    clusterLabel: clusterTone.label,
  };
}
