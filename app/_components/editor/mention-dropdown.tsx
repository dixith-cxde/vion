import { forwardRef, useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { type MentionEntity } from "./editor-utils";

interface MentionDropdownProps {
  activeIndex: number;
  items: MentionEntity[];
  onHover: (index: number) => void;
  onSelect: (item: MentionEntity) => void;
}

function getTypeClasses(type: MentionEntity["type"]) {
  return type === "TASK" ? "success" : type === "USER" ? "secondary" : "document";
}

function getGroupedItems(items: MentionEntity[]) {
  const users = items.filter((item) => item.type === "USER");
  const tasks = items.filter((item) => item.type === "TASK");
  const documents = items.filter((item) => item.type === "DOCUMENT");

  return [
    { label: "Users", items: users },
    { label: "Tasks", items: tasks },
    { label: "Documents", items: documents },
  ].filter((group) => group.items.length > 0);
}

const MentionDropdown = forwardRef<HTMLDivElement, MentionDropdownProps>(function MentionDropdown(
  { activeIndex, items, onHover, onSelect },
  ref
) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const groupedItems = getGroupedItems(items);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <Card
      ref={ref}
      onMouseDown={(event) => event.preventDefault()}
      className="absolute left-6 top-10 z-50 w-[22rem] overflow-hidden border-border/70 bg-popover/95 shadow-2xl backdrop-blur-xl"
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b">
        <div>
          <CardTitle className="text-sm">Mentions</CardTitle>
          <CardDescription className="mt-1">Pick with arrows and press enter</CardDescription>
        </div>
        <Badge variant="muted" className="uppercase tracking-[0.14em]">
          {items.length}
        </Badge>
      </CardHeader>

      <CardContent className="max-h-80 overflow-y-auto p-2">
        {items.length ? (
          groupedItems.map((group) => (
            <div key={group.label} className="pb-1 last:pb-0">
              <p className="px-3 pb-2 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => {
                const index = items.findIndex(
                  (candidate) => candidate.id === item.id && candidate.type === item.type
                );
                const isActive = index === activeIndex;

                return (
                  <Button
                    key={`${item.type}-${item.id}`}
                    ref={(node) => {
                      itemRefs.current[index] = node;
                    }}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-auto w-full items-start justify-between rounded-2xl px-3 py-3 text-left",
                      isActive && "bg-muted text-foreground ring-1 ring-border"
                    )}
                    onClick={() => onSelect(item)}
                    onMouseEnter={() => onHover(index)}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.label}</p>
                      <Badge
                        variant={getTypeClasses(item.type)}
                        className="mt-2 uppercase tracking-[0.14em]"
                      >
                        {item.type}
                      </Badge>
                    </div>
                    <span className="ml-4 text-xs font-medium text-muted-foreground">Enter</span>
                  </Button>
                );
              })}
              <Separator className="mt-1 last:hidden" />
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-muted px-4 py-6 text-sm text-muted-foreground">
            No matching entities found.
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default MentionDropdown;
