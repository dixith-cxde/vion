"use client";

import { Activity, ArrowRight, ArrowUpRight, FileText, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { badgeStyle, iconBox, sectionSurfaceStyle, textColor } from "./dashboard-theme";
import type { AccentKey } from "./dashboard-theme";

export type StatCardItem = {
  label: string;
  value: number;
  icon: typeof FileText;
  accent: AccentKey;
  hint: string;
  link?: string;
};

export function StatCardsGrid({
  cards,
  onNavigate,
}: {
  cards: StatCardItem[];
  onNavigate: (link: string) => void;
}) {
  return (
    <div className="mb-6 grid select-none grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={cn(
            "group relative overflow-hidden rounded-md border p-4 transition-all duration-300",
            "hover:-translate-y-1 hover:shadow-md",
            "hover:shadow-black/5 dark:hover:shadow-black/30",
            "cursor-pointer"
          )}
          onClick={() => card.link && onNavigate(card.link)}
          style={{
            background: `var(--vion-${card.accent})`,
            border: `1px solid var(--vion-${card.accent}-border)`,
          }}
        >
          <div className={cn("pointer-events-none absolute inset-0 opacity-[0.03]", "transition-opacity duration-300 group-hover:opacity-[0.06]")}>
            <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 45%)" }} />
          <CardContent className="relative z-10 w-full p-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80" style={textColor(card.accent)}>{card.label}</p>
                <div className="mt-3 flex items-end gap-2">
                  <p className={cn("text-4xl font-black tracking-tight tabular-nums", "transition-all duration-300", "group-hover:scale-[1.02] group-hover:tracking-tighter")} style={textColor(card.accent)}>{card.value}</p>
                  {card.hint && <span className="mb-1 truncate text-xs font-medium text-muted-foreground">/ {card.hint}</span>}
                </div>
              </div>
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", "transition-all duration-300", "group-hover:scale-110 group-hover:rotate-3")} style={iconBox(card.accent)}>
                <card.icon className="size-4" />
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden">
            <div className={cn("h-full w-1/2 transition-all duration-700", "translate-x-[-120%] group-hover:translate-x-[220%]")} style={{ background: `linear-gradient(90deg, transparent, var(--vion-${card.accent}-border), transparent)` }} />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function CompletionCard({ done, total, rate, inProgress, todo }: { done: number; total: number; rate: number; inProgress: number; todo: number }) {
  return (
    <Card className={cn("group relative mb-6 overflow-hidden rounded-xl border shadow-none", "transition-all duration-300", "hover:border-white/10 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20")}>
      <div className={cn("pointer-events-none absolute inset-0 opacity-[0.025]", "transition-opacity duration-300 group-hover:opacity-[0.05]")}>
        <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      </div>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent opacity-70" />
      <CardContent className="relative z-10 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md border" style={{ background: "var(--vion-amber)", borderColor: "var(--vion-amber-border)" }}>
              <Zap className="size-4" style={textColor("amber")} />
            </div>
            <div>
              <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Task completion</p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground">{rate}%</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold tabular-nums text-foreground">{done}<span className="mx-1 text-muted-foreground">/</span>{total}</p>
            <p className="mt-1 text-xs text-muted-foreground">completed tasks</p>
          </div>
        </div>
        <div className="mt-5">
          <div className="relative">
            <Progress value={rate} className="h-2 rounded-full bg-muted/60" />
            <div className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-white/20 blur-sm transition-all duration-500" style={{ width: `${rate}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <ProgressDot color="var(--vion-green-text)" label={`${done} done`} />
            <ProgressDot color="var(--vion-amber-text)" label={`${inProgress} in progress`} />
            <ProgressDot color="var(--muted-foreground)" label={`${todo} todo`} />
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 h-[3px] w-full overflow-hidden">
        <div className="h-full w-1/2 translate-x-[-120%] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent transition-all duration-700 group-hover:translate-x-[220%]" />
      </div>
    </Card>
  );
}

export function SectionCard({ accent, sectionLabel, title, actionLabel, onAction, scrollHeightClassName, children }: { accent: AccentKey; sectionLabel: string; title: string; actionLabel?: string; onAction?: () => void; scrollHeightClassName?: string; children: React.ReactNode }) {
  return (
    <section className="pt-2">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={textColor(accent)}>{sectionLabel}</p>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        </div>
        {actionLabel && onAction && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={onAction}>
            {actionLabel}
            <ArrowUpRight className="size-3" />
          </Button>
        )}
      </div>
      <div className="rounded-lg px-4 py-3 md:px-5" style={sectionSurfaceStyle(accent)}>
        <ScrollArea className={cn("min-h-0 pr-3", scrollHeightClassName ?? "h-[320px]")}>
          <div className="pr-1">{children}</div>
        </ScrollArea>
      </div>
    </section>
  );
}

export function EntityRow({ icon: Icon, accent, title, meta, badge, badgeAccent, onClick }: { icon: typeof FileText; accent: AccentKey; title: string; meta: string; badge?: string; badgeAccent?: AccentKey; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-md border-b border-black/5 px-2 py-3 text-left transition-colors last:border-b-0 hover:bg-background/65 dark:border-white/5 dark:hover:bg-background/20">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md" style={iconBox(accent)}>
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground leading-snug">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{meta}</p>
      </div>
      {badge && badgeAccent && (
        <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold" style={badgeStyle(badgeAccent)}>{badge}</span>
      )}
      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/25 transition-colors group-hover:text-muted-foreground/60" />
    </button>
  );
}

export function SnapshotRow({ label, value, accent }: { label: string; value: string; accent?: AccentKey }) {
  return (
    <div className="rounded-md bg-background/55 px-3 py-3 dark:bg-background/20">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight" style={accent ? textColor(accent) : { color: "var(--foreground)" }}>{value}</p>
    </div>
  );
}

export function RelationshipRow({ sourceLabel, targetLabel, relationshipType }: { sourceLabel: string; targetLabel: string; relationshipType: string }) {
  return (
    <div className="rounded-md border-b border-black/5 px-2 py-3 last:border-b-0 dark:border-white/5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md" style={iconBox("purple")}>
          <Activity className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 text-foreground">
            <span className="font-medium">{sourceLabel}</span>
            <ArrowRight className="size-3 text-muted-foreground/50" />
            <span className="font-medium">{targetLabel}</span>
          </p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em]" style={textColor("purple")}>{relationshipType}</p>
        </div>
      </div>
    </div>
  );
}

export function ProgressDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function EmptyState({ icon: Icon, message }: { icon: typeof FileText; message: string }) {
  return (
    <div className="flex min-h-24 items-center gap-3 rounded-md bg-background/55 px-3 text-left dark:bg-background/20">
      <Icon className="size-4 text-muted-foreground/35" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
