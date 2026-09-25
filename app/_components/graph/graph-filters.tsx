"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export function FilterPopover({
  label,
  count,
  total,
  children,
}: {
  label: string;
  count: number;
  total: number;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg border-0 bg-white/80 shadow-none ring-1 ring-slate-200"
        >
          {label}
          <span className="text-xs text-muted-foreground">
            {count}/{total}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 rounded-lg border-0 p-0 shadow-none ring-1 ring-slate-200"
      >
        <PopoverHeader className="border-b border-border/60 px-4 py-4">
          <PopoverTitle>{label}</PopoverTitle>
          <PopoverDescription>Refine what stays visible in the graph.</PopoverDescription>
        </PopoverHeader>
        <div className="max-h-72 space-y-1 overflow-auto p-3">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

export function FilterCheckboxRow({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  label: string;
  onCheckedChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-muted/35">
      <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

export function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-slate-200 pl-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold tracking-tight text-foreground">{value}</div>
    </div>
  );
}
