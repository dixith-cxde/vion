"use client";

import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Clock3,
  FileText,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

type Document = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export default function DocumentsPage() {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    async function fetchDocuments() {
      if (!activeWorkspace) return;

      try {
        const res = await fetch(`/api/workspaces/${activeWorkspace.id}/documents`);
        if (!res.ok) {
          throw new Error("Failed to load documents");
        }
        const json = await res.json();
        setDocuments(json.data);
      } catch (err) {
        console.error(err);
        toast({
          title: "Unable to load documents",
          description: "Refresh the page and try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }

    void fetchDocuments();
  }, [activeWorkspace]);

  async function handleCreate() {
    if (!activeWorkspace) return;

    setCreating(true);

    try {
      const res = await fetch(`/api/workspaces/${activeWorkspace.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Document",
        }),
      });

      if (!res.ok) {
        throw new Error("Create failed");
      }

      const json = await res.json();

      if (!json.success || !json.data?.id) {
        console.error("Create failed:", json);
        toast({
          title: "Document creation failed",
          description: "A new document could not be created.",
          variant: "destructive",
        });
        setCreating(false);
        return;
      }

      router.push(`/workspaces/${activeWorkspace.id}/documents/${json.data.id}`);
    } catch (err) {
      console.error(err);
      toast({
        title: "Document creation failed",
        description: "A new document could not be created.",
        variant: "destructive",
      });
      setCreating(false);
    }
  }

  function refreshDocuments() {
    if (!activeWorkspace) return;

    setRefreshing(true);
    startTransition(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/workspaces/${activeWorkspace.id}/documents`);
          if (!res.ok) {
            throw new Error("Failed to refresh documents");
          }
          const json = await res.json();
          setDocuments(json.data);
        } catch (err) {
          console.error(err);
          toast({
            title: "Unable to refresh documents",
            description: "Refresh the page and try again.",
            variant: "destructive",
          });
        } finally {
          setRefreshing(false);
        }
      })();
    });
  }

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredDocuments = documents.filter((document) =>
    document.title.toLowerCase().includes(normalizedSearch),
  );

  const sortedDocuments = [...documents].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const latestDocument = sortedDocuments[0] ?? null;
  const updatedTodayCount = documents.filter((document) => {
    const updated = new Date(document.updatedAt);
    const now = new Date();

    return (
      updated.getFullYear() === now.getFullYear() &&
      updated.getMonth() === now.getMonth() &&
      updated.getDate() === now.getDate()
    );
  }).length;

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge
              variant="muted"
              className="w-fit px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]"
            >
              Workspace Documents
            </Badge>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeWorkspace?.name ?? "Workspace"} documents
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Notes, references, and living specs for the workspace. Keep the
                list clean, searchable, and easy to move through.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={refreshDocuments}
              disabled={refreshing}
              className="rounded-lg"
            >
              {refreshing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Refresh
            </Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg"
            >
              <Plus className="size-4" />
              {creating ? "Opening..." : "New document"}
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <SectionHeader
            eyebrow="Overview"
            title="Document library"
            description="A compact snapshot of volume, freshness, and the most recently touched work."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <StatCard
              label="Total documents"
              value={`${documents.length}`}
              hint={`${documents.length === 1 ? "Entry" : "Entries"} in this workspace`}
            />
            <StatCard
              label="Updated today"
              value={`${updatedTodayCount}`}
              hint="Recent edits made today"
            />
            <StatCard
              label="Latest activity"
              value={latestDocument ? formatDate(latestDocument.updatedAt) : "None"}
              hint={latestDocument?.title ?? "No recent updates yet"}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between">
            <SectionHeader
              eyebrow="Library"
              title="All documents"
              description="Scan the catalog, jump into a page, or start a new document."
            />
            <div className="w-full md:max-w-sm">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search documents"
                  className="rounded-lg pl-9"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <FileText className="size-4" />
              <span>
                {filteredDocuments.length} visible of {documents.length} document
                {documents.length === 1 ? "" : "s"}
              </span>
            </div>
            {normalizedSearch ? (
              <span>Filtered by “{deferredSearch.trim()}”</span>
            ) : null}
          </div>

          {filteredDocuments.length === 0 ? (
            documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Create the first document to start capturing specs, notes, and shared knowledge."
                actionLabel={creating ? "Opening..." : "Create first document"}
                onAction={handleCreate}
                disabled={creating}
              />
            ) : (
              <EmptyState
                icon={Search}
                title="No matching documents"
                description="Try a different search term or clear the current filter."
              />
            )
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/70">
              {filteredDocuments
                .sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime(),
                )
                .map((doc, index) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/workspaces/${activeWorkspace?.id}/documents/${doc.id}`,
                      )
                    }
                    className="flex w-full cursor-pointer items-center gap-4 border-b border-border/60 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/30"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sky-200/80 bg-sky-50 text-sky-700">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {doc.title}
                      </div>
                      <div className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {getDocumentDescription(doc)}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          Updated {formatDateTime(doc.updatedAt)}
                        </span>
                        <span>Created {formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-lg border-sky-200/80 bg-sky-50 text-[10px] uppercase tracking-[0.14em] text-sky-700"
                      >
                        {formatDocumentStatus(doc.status)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="rounded-lg text-[10px] uppercase tracking-[0.14em]"
                      >
                        V{doc.version}
                      </Badge>
                      {index === 0 ? (
                        <Badge
                          variant="outline"
                          className="rounded-lg text-[10px] uppercase tracking-[0.14em]"
                        >
                          Latest
                        </Badge>
                      ) : null}
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{hint}</div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: {
  icon: typeof FileText;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border/70 px-6 py-10 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button
          onClick={onAction}
          disabled={disabled}
          className="mt-5 rounded-lg"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDocumentStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (char) =>
    char.toUpperCase(),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDocumentDescription(document: Document) {
  const summary = document.summary?.trim();

  if (summary) {
    return summary;
  }

  return `Version ${document.version} ${formatDocumentStatus(document.status).toLowerCase()} document in this workspace.`;
}
