"use client";

import type { Block } from "@blocknote/core";
import { useEffect, useMemo, useRef, useState } from "react";
import "@blocknote/mantine/style.css";
import "./editor.css";

import { EditorCollaborationProvider, useCollaborativeMeta } from "./collaboration-context";
import { CollaborationPresence } from "./collaboration-presence";
import EditorWrapper from "./document-editor-wrapper";
import { RelationshipsPanel } from "@/app/_components/relationship/relationship-panel";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "@/hooks/use-toast";
import { SaveState } from "@/types";
import { cn } from "@/lib/utils";

const SAVE_STATE_TEXT: Record<SaveState, string> = {
  idle: "text-muted-foreground/30",
  saving: "text-amber-500 animate-pulse",
  saved: "text-emerald-500",
  error: "text-rose-500",
};
const SAVE_STATE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "Saving",
  saved: "Saved",
  error: "Error",
};
const DOC_STATUS_CLASS: Record<string, string> = {
  PUBLISHED: "bg-blue-50 text-blue-600 border-blue-100",
  DRAFT: "bg-zinc-50 text-zinc-500 border-zinc-200",
};

type WorkspaceMember = {
  user: { id: string; name: string | null; email: string | null };
};

interface EditorProps {
  documentId: string;
  workspaceId: string;
  initialContent?: Block[];
  editable?: boolean;
  meta: {
    title: string;
    status: string;
    version: number;
    summary?: string | null;
    authorId?: string | null;
    authorName?: string | null;
    createdAt: string;
    updatedAt: string;
  };
}

type DocumentMetaState = {
  title: string;
  summary: string;
  status: "DRAFT" | "PUBLISHED";
  version: number;
  authorId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
function isDocStatus(value: string): value is "DRAFT" | "PUBLISHED" {
  return value === "DRAFT" || value === "PUBLISHED";
}
function formatMemberLabel(m: { name: string | null; email: string | null }) {
  return m.name ?? m.email ?? "Unknown";
}

export default function DocumentEditor(props: EditorProps) {
  return (
    <EditorCollaborationProvider
      context={{
        entityType: "DOCUMENT",
        entityId: props.documentId,
        workspaceId: props.workspaceId,
      }}
      initialContent={props.initialContent}
      initialMeta={{
        title: props.meta.title,
        summary: props.meta.summary ?? "",
        status: props.meta.status,
        version: props.meta.version,
        authorId: props.meta.authorId ?? "",
      }}
    >
      <Content {...props} />
    </EditorCollaborationProvider>
  );
}

function Content({ documentId, workspaceId, initialContent, meta, editable = true }: EditorProps) {
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveErrorShownRef = useRef(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const { meta: collaborativeMeta, updateMeta } = useCollaborativeMeta<DocumentMetaState>({
    title: meta.title,
    summary: meta.summary ?? "",
    status: isDocStatus(meta.status) ? meta.status : "DRAFT",
    version: meta.version,
    authorId: meta.authorId ?? "",
  });

  const createdAt = useMemo(() => formatDate(meta.createdAt), [meta.createdAt]);
  const updatedAt = useMemo(() => formatDate(meta.updatedAt), [meta.updatedAt]);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: WorkspaceMember[] };
        setMembers(json.data ?? []);
      } catch {
        /* non-critical */
      }
    }
    void fetchMembers();
  }, [workspaceId]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    if (!editable) {
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveState("saving");
        const authorMember = members.find((m) => m.user.id === collaborativeMeta.authorId);
        const res = await fetch(`/api/workspaces/${workspaceId}/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: collaborativeMeta.title.trim() || "Untitled",
            summary: collaborativeMeta.summary,
            status: collaborativeMeta.status,
            version: collaborativeMeta.version,
            authorId: collaborativeMeta.authorId || undefined,
            authorName: authorMember ? formatMemberLabel(authorMember.user) : undefined,
          }),
        });
        if (!res.ok) throw new Error();
        saveErrorShownRef.current = false;
        setSaveState("saved");
      } catch {
        setSaveState("error");
        if (!saveErrorShownRef.current) {
          saveErrorShownRef.current = true;
          toast({ title: "Document update failed", variant: "destructive" });
        }
      }
    }, 800);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [collaborativeMeta, documentId, editable, members, workspaceId]);

  const selectedAuthor = useMemo(
    () => members.find((m) => m.user.id === collaborativeMeta.authorId) ?? null,
    [members, collaborativeMeta.authorId]
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden bg-background">
      {/* ── Main writing column ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-6 py-3">
          <CollaborationPresence />
          <div className="flex items-center gap-3">
            {!editable ? (
              <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Read only
              </span>
            ) : null}
            <span
              className={cn(
                "text-[11px] font-medium transition-colors duration-300",
                SAVE_STATE_TEXT[saveState]
              )}
            >
              {SAVE_STATE_LABEL[saveState]}
            </span>
          </div>
        </div>

        {/* Writing surface */}
        <ScrollArea className="flex-1 overflow-auto">
          <div className="mx-auto w-full h-full overflow-scroll px-8 pb-10 pt-10 bg-white">
            <div className="sticky inset-0 bg-white opacity-100 z-10 pb-5">
              <Input
                value={collaborativeMeta.title}
                onChange={(e) => updateMeta({ title: e.target.value })}
                readOnly={!editable}
                className="h-auto border-0 p-0 !text-5xl font-bold tracking-tight shadow-none focus-visible:ring-0 rounded-none px-1 bg-inherit"
                placeholder="Untitled"
              />
              <Textarea
                value={collaborativeMeta.summary}
                onChange={(e) => updateMeta({ summary: e.target.value })}
                readOnly={!editable}
                rows={1}
                className="mt-3 min-h-0 resize-none border-0 bg-inherit  p-0 text-base leading-relaxed text-muted-foreground shadow-none focus-visible:ring-0"
                placeholder="Add a short summary…"
              />
            </div>

            <Separator className="my-6" />
            <EditorWrapper
              documentId={documentId}
              workspaceId={workspaceId}
              initialContent={initialContent}
              setSaveState={setSaveState}
              editable={editable}
            />
          </div>
        </ScrollArea>
      </div>

      {/* ── Right sidebar ── */}
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
          <RelationshipsPanel
            workspaceId={workspaceId}
            entityType="DOCUMENT"
            entityId={documentId}
          />
        </ScrollArea>
      </aside>
    </div>
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
