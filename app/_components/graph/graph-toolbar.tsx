"use client";

import { Focus, RefreshCw, Search, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ENTITY_LABEL,
  RELATIONSHIP_LABEL,
  type EntityType,
  type RelationshipType,
} from "@/lib/constants";

import { FilterCheckboxRow, FilterPopover } from "./graph-filters";
import { formatToken } from "./graph-layout";
import type { GraphResponse } from "./graph-types";

type GraphToolbarProps = {
  payload: GraphResponse["data"];
  search: string;
  onSearchChange: (value: string) => void;
  activeTypes: string[];
  onToggleType: (value: string) => void;
  activeRelationships: string[];
  onToggleRelationship: (value: string) => void;
  focusMode: boolean;
  onFocusModeChange: (value: boolean) => void;
  recentOnly: boolean;
  onRecentOnlyChange: (value: boolean) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFitView: () => void;
  onRefresh: () => void;
};

export function toggleGraphItem(list: string[], value: string) {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

export function GraphToolbar({
  payload,
  search,
  onSearchChange,
  activeTypes,
  onToggleType,
  activeRelationships,
  onToggleRelationship,
  focusMode,
  onFocusModeChange,
  recentOnly,
  onRecentOnlyChange,
  onZoomOut,
  onZoomIn,
  onFitView,
  onRefresh,
}: GraphToolbarProps) {
  return (
    <div className="border-b border-border/60 px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Graph</h1>
          <p className="text-sm text-muted-foreground">
            Compact workspace map with clustered entities and direct relationship flow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onZoomOut}>
            <ZoomOut className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onZoomIn}>
            <ZoomIn className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onFitView}>
            <Focus className="size-4" />
            Fit view
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search nodes by title, type, or id"
            className="rounded-lg border-0 bg-white/80 pl-9 ring-1 ring-slate-200 shadow-none focus-visible:ring-1 focus-visible:ring-sky-300"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPopover
            label="Entity types"
            count={activeTypes.length}
            total={payload.meta.entityTypes.length}
          >
            {payload.meta.entityTypes.map((type) => (
              <FilterCheckboxRow
                key={type}
                checked={activeTypes.includes(type)}
                label={ENTITY_LABEL[type as EntityType] ?? formatToken(type)}
                onCheckedChange={() => onToggleType(type)}
              />
            ))}
          </FilterPopover>

          <FilterPopover
            label="Relationships"
            count={activeRelationships.length}
            total={payload.meta.relationshipTypes.length}
          >
            {payload.meta.relationshipTypes.map((type) => (
              <FilterCheckboxRow
                key={type}
                checked={activeRelationships.includes(type)}
                label={RELATIONSHIP_LABEL[type as RelationshipType] ?? formatToken(type)}
                onCheckedChange={() => onToggleRelationship(type)}
              />
            ))}
          </FilterPopover>

          <div className="flex items-center gap-2 border-l border-violet-200 pl-3">
            <Switch
              id="graph-focus-mode"
              checked={focusMode}
              onCheckedChange={onFocusModeChange}
              size="sm"
            />
            <Label htmlFor="graph-focus-mode" className="text-xs font-medium text-foreground">
              Focus mode
            </Label>
          </div>

          <div className="flex items-center gap-2 border-l border-sky-200 pl-3">
            <Switch
              id="graph-recent-only"
              checked={recentOnly}
              onCheckedChange={onRecentOnlyChange}
              size="sm"
            />
            <Label htmlFor="graph-recent-only" className="text-xs font-medium text-foreground">
              Recent only
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
