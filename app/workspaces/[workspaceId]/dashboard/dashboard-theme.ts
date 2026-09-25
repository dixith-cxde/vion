import { CheckCircle2, CheckSquare2, TimerReset } from "lucide-react";
import type { CSSProperties } from "react";

export type AccentKey = "blue" | "amber" | "green" | "purple";

export function iconBox(accent: AccentKey): CSSProperties {
  return {
    backgroundColor: `var(--vion-${accent}-bg)`,
    color: `var(--vion-${accent}-text)`,
  };
}

export function textColor(accent: AccentKey): CSSProperties {
  return { color: `var(--vion-${accent}-text)` };
}

export function badgeStyle(accent: AccentKey): CSSProperties {
  return {
    backgroundColor: `var(--vion-${accent}-bg)`,
    color: `var(--vion-${accent}-text)`,
    border: `1px solid var(--vion-${accent}-border)`,
  };
}

export function sectionSurfaceStyle(accent: AccentKey): CSSProperties {
  return {
    backgroundColor: `color-mix(in srgb, var(--vion-${accent}-bg) 62%, var(--background))`,
  };
}

export const STATUS_ACCENT: Record<string, AccentKey> = {
  DONE: "green",
  IN_PROGRESS: "amber",
  TODO: "blue",
};

export function taskAccent(status: string): AccentKey {
  return STATUS_ACCENT[status] ?? "blue";
}

export function taskIcon(status: string) {
  if (status === "DONE") return CheckCircle2;
  if (status === "IN_PROGRESS") return TimerReset;
  return CheckSquare2;
}
