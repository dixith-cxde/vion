"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  FileText,
  LoaderCircle,
  Plus,
  Search,
} from "lucide-react";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Document = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

const STATUS_CLASS: Record<string, string> = {
  PUBLISHED: "bg-blue-50 text-blue-600",
  DRAFT: "bg-zinc-100 text-zinc-500",
};

export default function DocumentsPage() {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    async function fetch_() {
      if (!activeWorkspace) return;
      try {
        const res = await fetch(
          `/api/workspaces/${activeWorkspace.id}/documents`,
        );
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { data: Document[] };
        setDocuments(json.data ?? []);
      } catch {
        toast({
          title: "Unable to load documents",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    void fetch_();
  }, [activeWorkspace]);

  async function handleCreate() {
    if (!activeWorkspace || creating) return;
    setCreating(true);
    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Untitled" }),
        },
      );
      if (!res.ok) throw new Error();
      const json = (await res.json()) as {
        success: boolean;
        data?: { id: string };
      };
      if (!json.success || !json.data?.id) throw new Error();
      router.push(
        `/workspaces/${activeWorkspace.id}/documents/${json.data.id}`,
      );
    } catch {
      toast({ title: "Document creation failed", variant: "destructive" });
      setCreating(false);
    }
  }

  const q = deferredSearch.trim().toLowerCase();
  const filtered = documents
    .filter((d) => d.title.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2.5">
        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Documents</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {activeWorkspace?.name} · {documents.length} document
              {documents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating}
            size="sm"
            className="rounded-full"
          >
            <Plus className="size-3.5" />
            {creating ? "Opening…" : "New"}
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="h-9 rounded-full pl-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          <EmptyState
            hasSearch={!!q}
            onCreate={handleCreate}
            creating={creating}
          />
        ) : (
          <div className="space-y-1">
            {filtered.map((doc, i) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                isLatest={i === 0 && !q}
                onClick={() =>
                  router.push(
                    `/workspaces/${activeWorkspace?.id}/documents/${doc.id}`,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentCard({
  doc,
  isLatest,
  onClick,
}: {
  doc: Document;
  isLatest: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
    >
      {/* Icon */}
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
        <FileText className="size-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {doc.title}
          </p>
          {isLatest && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Latest
            </span>
          )}
        </div>

        {doc.summary && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {doc.summary}
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-medium",
              STATUS_CLASS[doc.status] ?? "bg-zinc-100 text-zinc-500",
            )}
          >
            {doc.status.charAt(0) + doc.status.slice(1).toLowerCase()}
          </span>
          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            v{doc.version}
          </span>
          <span className="text-[11px] text-muted-foreground/60">
            Updated {timeAgo(doc.updatedAt)}
          </span>
          <span className="text-[11px] text-muted-foreground/40">·</span>
          <span className="text-[11px] text-muted-foreground/60">
            {formatDate(doc.createdAt)}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground/20 transition-colors group-hover:text-muted-foreground/60" />
    </button>
  );
}

function EmptyState({
  hasSearch,
  onCreate,
  creating,
}: {
  hasSearch: boolean;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 px-6 py-10 text-center">
      <FileText className="mb-2 size-5 text-muted-foreground/30" />
      <p className="text-sm font-medium text-foreground">
        {hasSearch ? "No matching documents" : "No documents yet"}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {hasSearch
          ? "Try a different search term."
          : "Create a document to start."}
      </p>
      {!hasSearch && (
        <Button
          onClick={onCreate}
          disabled={creating}
          size="sm"
          className="mt-4 rounded-full"
        >
          <Plus className="size-3.5" />
          Create first document
        </Button>
      )}
    </div>
  );
}
