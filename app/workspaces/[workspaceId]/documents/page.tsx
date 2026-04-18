"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Sparkles } from "lucide-react";
import { useWorkspace } from "@/app/_components/context/workspace-context-provider";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Document = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function DocumentsPage() {
  const { activeWorkspace } = useWorkspace();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchDocuments() {
      if (!activeWorkspace) return;

      try {
        const res = await fetch(
          `/api/workspaces/${activeWorkspace.id}/documents`,
        );
        const json = await res.json();
        setDocuments(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [activeWorkspace]);

  async function handleCreate() {
    if (!activeWorkspace) return;

    setCreating(true);

    try {
      const res = await fetch(
        `/api/workspaces/${activeWorkspace.id}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Untitled Document", // REQUIRED for schema
          }),
        },
      );

      const json = await res.json();

      // SAFETY CHECK
      if (!json.success || !json.data?.id) {
        console.error("Create failed:", json);
        setCreating(false);
        return;
      }

      router.push(
        `/workspaces/${activeWorkspace.id}/documents/${json.data.id}`,
      );
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto flex min-h-40 max-w-6xl items-center justify-center text-sm text-muted-foreground">
          Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div className="px-3 py-4 md:px-4 md:py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <Badge
              variant="muted"
              className="w-fit uppercase tracking-[0.16em]"
            >
              Workspace Documents
            </Badge>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {activeWorkspace?.name ?? "Workspace"} documents
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Notes, specs, references, and living docs for this workspace.
                Open an existing document or create a new one to start writing.
              </p>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating}
            size="sm"
            className="h-9 rounded-full px-4"
          >
            <Plus className="size-4" />
            {creating ? "Opening..." : "New Document"}
          </Button>
        </header>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Sparkles className="size-4" />
            <span>
              {documents.length} document{documents.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {documents.length === 0 ? (
          <section className="flex min-h-72 flex-col items-center justify-center px-6 py-10 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No documents yet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              This workspace does not have any documents yet. Create the first
              one to start capturing ideas, specs, and team knowledge.
            </p>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="mt-6 rounded-full"
            >
              <Plus className="size-4" />
              {creating ? "Opening..." : "Create first document"}
            </Button>
          </section>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="group cursor-pointer border-border/70 shadow-none transition-colors hover:border-foreground/15 hover:bg-muted/30"
                onClick={() =>
                  router.push(
                    `/workspaces/${activeWorkspace?.id}/documents/${doc.id}`,
                  )
                }
              >
                <CardHeader className="gap-3 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-muted p-2.5">
                      <FileText className="size-4 text-muted-foreground" />
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase tracking-[0.14em]"
                    >
                      Document
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-2 text-base leading-6">
                      {doc.title}
                    </CardTitle>
                    <CardDescription>Open and continue editing</CardDescription>
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Last updated
                  </div>
                  <div className="mt-1 text-sm font-medium">
                    {new Date(doc.updatedAt).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
