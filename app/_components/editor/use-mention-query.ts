"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { toast } from "@/hooks/use-toast";

import type { MentionEntity } from "./editor-utils";

export function useMentionQuery(workspaceId: string) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entities, setEntities] = useState<MentionEntity[]>([]);
  const entityLoadErrorShownRef = useRef(false);

  useEffect(() => {
    async function fetchEntities() {
      try {
        if (!workspaceId) return;

        const params = new URLSearchParams();
        const trimmedQuery = mentionQuery.trim();

        if (trimmedQuery) {
          params.set("q", trimmedQuery);
        }

        params.set("limit", "20");

        const response = await fetch(
          `/api/workspaces/${workspaceId}/entities?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to load mention entities");
        }
        const payload = (await response.json()) as { data?: MentionEntity[] };
        entityLoadErrorShownRef.current = false;
        setEntities(payload.data ?? []);
      } catch (err) {
        console.error("Entity fetch failed", err);
        if (!entityLoadErrorShownRef.current) {
          entityLoadErrorShownRef.current = true;
          toast({
            title: "Mentions unavailable",
            description: "Workspace entities could not be loaded.",
            variant: "destructive",
          });
        }
      }
    }

    void fetchEntities();
  }, [mentionQuery, workspaceId]);

  const filteredEntities = useMemo(() => entities, [entities]);

  const highlightedIndex =
    filteredEntities.length > 0 ? Math.min(activeIndex, filteredEntities.length - 1) : 0;

  return {
    showMentions,
    setShowMentions,
    mentionQuery,
    setMentionQuery,
    setActiveIndex,
    filteredEntities,
    highlightedIndex,
  };
}
