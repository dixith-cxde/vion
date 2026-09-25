"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { readMetaMap, toMetaEntries, type MetaValue } from "./collab-utils";
import { useEditorCollaboration } from "./collaboration-context";

export function useCollaborativeMeta<T extends Record<string, MetaValue>>(initialMeta: T) {
  const { doc, meta, synced } = useEditorCollaboration();

  const [state, setState] = useState(initialMeta);

  const initialMetaRef = useRef(initialMeta);

  useEffect(() => {
    initialMetaRef.current = initialMeta;
  }, [initialMeta]);

  useEffect(() => {
    const update = () => {
      const next = readMetaMap(meta, initialMetaRef.current);

      setState((current) => {
        const changed = Object.entries(next).some(([k, v]) => current[k as keyof T] !== v);

        return changed ? next : current;
      });
    };

    update();

    meta.observe(update);

    return () => {
      meta.unobserve(update);
    };
  }, [meta]);

  const updateMeta = useCallback(
    (patch: Partial<T>) => {
      doc.transact(() => {
        for (const [k, v] of toMetaEntries(patch)) {
          meta.set(k, v);
        }
      });
    },
    [doc, meta]
  );

  return {
    meta: state,
    updateMeta,
    synced,
  };
}
