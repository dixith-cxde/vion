"use client";

import { useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

export type MentionDropdownPosition = {
  left: number;
  top: number;
  width: number;
  placement: "top" | "bottom";
};

export function useDropdownPosition(
  showMentions: boolean,
  setDropdownPosition: Dispatch<SetStateAction<MentionDropdownPosition | null>>
) {
  const updateDropdownPosition = useCallback(() => {
    if (!showMentions || typeof window === "undefined") {
      setDropdownPosition(null);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setDropdownPosition(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const anchorElement =
      selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? (selection.anchorNode as HTMLElement)
        : selection.anchorNode?.parentElement;
    const fallbackRect =
      anchorElement
        ?.closest(".bn-editor [data-content-type], .bn-editor .bn-block-content")
        ?.getBoundingClientRect() ?? null;
    const sourceRect = rect.width > 0 || rect.height > 0 ? rect : fallbackRect;

    if (!sourceRect) {
      setDropdownPosition(null);
      return;
    }

    const viewportPadding = 16;
    const preferredWidth = Math.min(420, Math.max(320, window.innerWidth * 0.32));
    const maxWidth = Math.max(280, window.innerWidth - viewportPadding * 2);
    const width = Math.min(preferredWidth, maxWidth);
    const left = Math.min(
      Math.max(sourceRect.left, viewportPadding),
      window.innerWidth - width - viewportPadding
    );
    const roomBelow = window.innerHeight - sourceRect.bottom;
    const placement = roomBelow > 280 ? "bottom" : "top";
    const top =
      placement === "bottom"
        ? Math.min(sourceRect.bottom + 12, window.innerHeight - viewportPadding - 120)
        : Math.max(viewportPadding, sourceRect.top - 12 - 320);

    setDropdownPosition({
      left,
      top,
      width,
      placement,
    });
  }, [setDropdownPosition, showMentions]);

  useEffect(() => {
    if (!showMentions) {
      setDropdownPosition(null);
      return;
    }

    updateDropdownPosition();

    const handleReposition = () => {
      updateDropdownPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    document.addEventListener("selectionchange", handleReposition);

    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
      document.removeEventListener("selectionchange", handleReposition);
    };
  }, [setDropdownPosition, showMentions, updateDropdownPosition]);

  return updateDropdownPosition;
}
