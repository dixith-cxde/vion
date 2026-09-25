"use client";

import { useState } from "react";

import { RelationshipsPanel } from "@/app/_components/relationship/relationship-panel";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  DOC_STATUS_CLASS,
  formatMemberLabel,
  isDocStatus,
  type DocumentMetaState,
  type WorkspaceMember,
} from "./document-constants";

type DocumentPropertiesProps = {
  workspaceId: string;
  documentId: string;
  collaborativeMeta: DocumentMetaState;
  updateMeta: (patch: Partial<DocumentMetaState>) => void;
  members: WorkspaceMember[];
  selectedAuthor: WorkspaceMember | null;
  createdAt: string;
  updatedAt: string;
  editable: boolean;
};

export function DocumentProperties({
  workspaceId,
  documentId,
  collaborativeMeta,
  updateMeta,
  members,
  selectedAuthor,
  createdAt,
  updatedAt,
  editable,
}: DocumentPropertiesProps) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-l bg-background xl:flex">
      <ScrollArea className="flex-1">
        <div className="px-5 py-5">
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Properties
          </p>
          <div className="space-y-3">
            <SidebarRow label="Status">
              <Select
                value={collaborativeMeta.status}
                disabled={!editable}
                onValueChange={(v) => {
                  if (isDocStatus(v)) updateMeta({ status: v });
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-7 w-full rounded-lg border px-3 text-[11px] font-medium shadow-none focus-visible:ring-0",
                    DOC_STATUS_CLASS[collaborativeMeta.status] ??
                      "bg-zinc-50 text-zinc-500 border-zinc-200"
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="p-3">
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                </SelectContent>
              </Select>
            </SidebarRow>

            <SidebarRow label="Version">
              <div className="flex h-7 w-full items-center gap-1 rounded-lg border border-violet-100 bg-violet-50 px-3">
                <span className="text-[11px] text-violet-400">v</span>
                <Input
                  type="number"
                  min="1"
                  readOnly={!editable}
                  value={String(collaborativeMeta.version)}
                  onChange={(e) =>
                    updateMeta({
                      version: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="h-auto flex-1 border-0 bg-transparent p-0 text-[11px] font-semibold text-violet-600 shadow-none focus-visible:ring-0"
                />
              </div>
            </SidebarRow>

            <SidebarRow label="Author">
              <AuthorPicker
                members={members}
                value={collaborativeMeta.authorId}
                onChange={(id) => updateMeta({ authorId: id })}
                selectedAuthor={selectedAuthor}
                disabled={!editable}
              />
            </SidebarRow>

            <SidebarRow label="Created">
              <span className="text-[11px] text-muted-foreground">{createdAt}</span>
            </SidebarRow>

            <SidebarRow label="Updated">
              <span className="text-[11px] text-muted-foreground">{updatedAt}</span>
            </SidebarRow>
          </div>
        </div>

        <Separator />
        <RelationshipsPanel workspaceId={workspaceId} entityType="DOCUMENT" entityId={documentId} />
      </ScrollArea>
    </aside>
  );
}

function SidebarRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </div>
  );
}

function AuthorPicker({
  members,
  value,
  onChange,
  selectedAuthor,
  disabled,
}: {
  members: WorkspaceMember[];
  value: string;
  onChange: (id: string) => void;
  selectedAuthor: WorkspaceMember | null;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={(nextOpen) => (!disabled ? setOpen(nextOpen) : null)}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          disabled={disabled}
          className="h-7 w-full justify-between rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-[11px] font-medium text-emerald-700 shadow-none hover:bg-emerald-100 hover:text-emerald-700"
        >
          <span className="truncate">
            {selectedAuthor ? formatMemberLabel(selectedAuthor.user) : "Unassigned"}
          </span>
          <ChevronsUpDown className="ml-1 size-3 shrink-0 opacity-40" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search members…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
              No members found.
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="none"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="gap-2 text-xs"
              >
                <Check className={cn("size-3.5", !value ? "opacity-100" : "opacity-0")} />
                Unassigned
              </CommandItem>
              {members.map((member) => (
                <CommandItem
                  key={member.user.id}
                  value={formatMemberLabel(member.user)}
                  onSelect={() => {
                    onChange(member.user.id);
                    setOpen(false);
                  }}
                  className="gap-2 text-xs"
                >
                  <Check
                    className={cn(
                      "size-3.5",
                      value === member.user.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {formatMemberLabel(member.user)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
