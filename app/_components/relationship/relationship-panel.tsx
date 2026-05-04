"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  CheckSquare,
  ArrowUpRight,
  RefreshCw,
  Link2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ENTITY_COLOR } from "@/lib/constants";

type LinkedEntity = {
  relationshipId: string;
  relationshipType: string;
  direction: "outgoing" | "incoming";
  entityType: "TASK" | "DOCUMENT";
  entityId: string;
  title: string;
};

type Props = {
  workspaceId: string;
  entityType: "TASK" | "DOCUMENT";
  entityId: string;
  className?: string;
};

const ENTITY_ICON = {
  TASK: CheckSquare,
  DOCUMENT: FileText,
} as const;

const RELATIONSHIP_TYPE_LABEL: Record<string, string> = {
  REFERENCES: "References",
  EXPLAINS: "Explains",
  RESOLVES: "Resolves",
  CONVERTED_TO: "Converted To",
  BLOCKS: "Blocks",
};

function getRelationshipLabel(type: string): string {
  return RELATIONSHIP_TYPE_LABEL[type] ?? type;
}

export function RelationshipsPanel({
  workspaceId,
  entityType,
  entityId,
  className,
}: Props) {
  const router = useRouter();
  const [linked, setLinked] = useState<LinkedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchRelationships() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/relationships?entityType=${entityType}&entityId=${entityId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as {
        success: boolean;
        data: LinkedEntity[];
      };
      setLinked(json.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRelationships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, entityType, entityId]);

  const tasks = linked.filter((item) => item.entityType === "TASK");
  const documents = linked.filter((item) => item.entityType === "DOCUMENT");

  function navigateTo(item: LinkedEntity) {
    const path =
      item.entityType === "TASK"
        ? `/workspaces/${workspaceId}/tasks/${item.entityId}`
        : `/workspaces/${workspaceId}/documents/${item.entityId}`;
    router.push(path);
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex w-72 shrink-0 flex-col border-l bg-background",
          className,
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Link2 className="size-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Linked
            </p>
            {linked.length > 0 && (
              <Badge
                variant="secondary"
                className="h-5 rounded-full px-1.5 text-[10px] font-semibold"
              >
                {linked.length}
              </Badge>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                onClick={() => void fetchRelationships()}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("size-3.5", loading && "animate-spin")}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              Refresh
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator />

        <ScrollArea className="flex-1">
          <div className="px-3 py-3">
            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                Failed to load linked entities.
              </div>
            )}

            {!loading && !error && linked.length === 0 && (
              <div className="mt-2 rounded-xl border border-dashed px-4 py-6 text-center">
                <Link2 className="mx-auto mb-2 size-4 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">
                  No linked entities yet.
                </p>
                <p className="mt-1 text-[0.65rem] text-muted-foreground/70">
                  Use <span className="font-semibold">@</span> in the editor to
                  reference a task or document.
                </p>
              </div>
            )}

            {tasks.length > 0 && (
              <EntityGroup label="Tasks" items={tasks} onSelect={navigateTo} />
            )}

            {tasks.length > 0 && documents.length > 0 && (
              <Separator className="my-3" />
            )}

            {documents.length > 0 && (
              <EntityGroup
                label="Documents"
                items={documents}
                onSelect={navigateTo}
              />
            )}
          </div>
        </ScrollArea>
      </aside>
    </TooltipProvider>
  );
}

function EntityGroup({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: LinkedEntity[];
  onSelect: (item: LinkedEntity) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {items.map((item) => {
        const color = ENTITY_COLOR[item.entityType];
        const Icon = ENTITY_ICON[item.entityType];

        return (
          <Button
            key={item.relationshipId}
            variant="ghost"
            className={cn(
              "group h-auto w-full justify-start rounded-xl border px-3 py-2.5 text-left",
              color.border,
            )}
            onClick={() => onSelect(item)}
          >
            <div
              className={cn(
                "mr-2.5 mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md",
                color.bg,
              )}
            >
              <Icon className={cn("size-3", color.text)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium leading-snug text-foreground">
                {item.title}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                {getRelationshipLabel(item.relationshipType)}
                {" · "}
                {item.direction === "incoming"
                  ? "referenced by"
                  : "referenced in"}
              </p>
            </div>
            <ArrowUpRight
              className={cn(
                "ml-1 mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60",
                color.text,
              )}
            />
          </Button>
        );
      })}
    </div>
  );
}
