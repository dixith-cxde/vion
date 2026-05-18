"use client";

import { cn } from "@/lib/utils";
interface StatCardProps {
  label: string;
  value: string | number;
  accent: "violet" | "amber" | "emerald" | "cyan";
  icon: React.ElementType;
}

export function StatCard({ label, value, accent, icon: Icon }: StatCardProps) {
  const accentStyles = {
    violet: {
      text: "text-violet-400",
      soft: "bg-violet-500/10",
      border: "group-hover:border-violet-500/20",
      glow: "group-hover:shadow-violet-500/5",
    },

    amber: {
      text: "text-amber-400",
      soft: "bg-amber-500/10",
      border: "group-hover:border-amber-500/20",
      glow: "group-hover:shadow-amber-500/5",
    },

    emerald: {
      text: "text-emerald-400",
      soft: "bg-emerald-500/10",
      border: "group-hover:border-emerald-500/20",
      glow: "group-hover:shadow-emerald-500/5",
    },

    cyan: {
      text: "text-cyan-400",
      soft: "bg-cyan-500/10",
      border: "group-hover:border-cyan-500/20",
      glow: "group-hover:shadow-cyan-500/5",
    },
  };

  const styles = accentStyles[accent];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl",
        "border border-border/50",
        "bg-background/40 backdrop-blur-xl",
        "transition-all duration-300",
        "hover:-translate-y-0.5",
        "hover:border-border",
        "hover:bg-background/60",
        "hover:shadow-md",
        styles.border,
        styles.glow
      )}
    >
      <div className="flex items-center justify-between px-4 py-3.5">
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            "transition-all duration-300",
            "group-hover:scale-105",
            styles.soft
          )}
        >
          <Icon className={cn("size-4 transition-transform duration-300", styles.text)} />
        </div>
        <div className="min-w-0">
          <p className=" font-semibold uppercase text-muted-foreground flex gap-3 items-center">
            <span className="text-3xl font-black  text-foreground">{value}</span>
            <span className="text-md"> {label}</span>
          </p>

          {/*<div className="mt-2 flex items-end gap-2">
            <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
          </div>*/}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className={cn("size-1 rounded-full opacity-70", styles.soft)} />

          <span className="text-[11px] text-muted-foreground">Workspace metric</span>
        </div>

        <span className="text-[11px] text-muted-foreground">Live</span>
      </div>
    </div>
  );
}
