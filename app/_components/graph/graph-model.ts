import { useMemo } from "react";

import { buildClusteredLayout } from "./graph-layout";
import type { GraphResponse } from "./graph-types";

type GraphModelArgs = {
  payload: GraphResponse["data"] | null;
  search: string;
  activeTypes: string[];
  activeRelationships: string[];
  selectedNodeId: string | null;
  focusMode: boolean;
  recentOnly: boolean;
};

export function useGraphModel({
  payload,
  search,
  activeTypes,
  activeRelationships,
  selectedNodeId,
  focusMode,
  recentOnly,
}: GraphModelArgs) {
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

  return {
    nodeMap,
    visibleEdges,
    filteredNodes,
    filteredEdges,
    selectedNode,
    selectedConnections,
    selectedNeighborhood,
    layout,
  };
}
