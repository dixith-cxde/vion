"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";

import MentionDropdown from "./mention-dropdown";
import {
  getMentionQueryAtCursor,
  lightTheme,
  normalizeEntities,
  parseInitialContent,
  replaceMentionTokenInBlock,
  type MentionEntity,
} from "./editor-utils";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { Block } from "@blocknote/core";

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

  // 🔥 CRITICAL
  onChange: (blocks: Block[]) => void;
}

export default function Editor({
  documentId,
  workspaceId,
  initialContent,
  editable = true,
  meta,
  onChange,
}: EditorProps) {
  const editor = useCreateBlockNote(
    {
      initialContent: parseInitialContent(initialContent),
    },
    [initialContent],
  );

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entities, setEntities] = useState<MentionEntity[]>([]);

  const [title, setTitle] = useState(meta.title);
  const [summary, setSummary] = useState(meta.summary ?? "");
  const [status, setStatus] = useState(meta.status);
  const [authorName, setAuthorName] = useState(meta.authorName ?? "");

  // ---------- FETCH ENTITIES ----------
  useEffect(() => {
    async function fetchEntities() {
      try {
        const [tasksRes, docsRes] = await Promise.all([
          fetch(`/api/workspaces/${workspaceId}/tasks`),
          fetch(`/api/workspaces/${workspaceId}/documents`),
        ]);

        const tasks = await tasksRes.json();
        const docs = await docsRes.json();

        setEntities(normalizeEntities(tasks, docs));
      } catch (err) {
        console.error("Entity fetch failed", err);
      }
    }

    fetchEntities();
  }, [workspaceId]);

  // ---------- MENTION LOGIC ----------
  const filteredEntities = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return entities;

    return entities.filter((e) => e.label.toLowerCase().includes(q));
  }, [entities, mentionQuery]);

  const highlightedIndex =
    filteredEntities.length > 0
      ? Math.min(activeIndex, filteredEntities.length - 1)
      : 0;

  const selectMention = useCallback(
    (item: MentionEntity) => {
      const cursor = editor.getTextCursorPosition();
      const block = cursor.block;

      const nextContent = replaceMentionTokenInBlock(
        block,
        item,
        mentionQuery,
        workspaceId,
      );

      editor.updateBlock(block, { content: nextContent as any });
      editor.setTextCursorPosition(block, "end");

      setShowMentions(false);
      setMentionQuery("");
    },
    [editor, mentionQuery, workspaceId],
  );

  // ---------- CONTENT CHANGE ----------
  const handleChange = () => {
    const query = getMentionQueryAtCursor();

    if (query !== null) {
      setShowMentions(true);
      setMentionQuery(query);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }

    // 🔥 ONLY THIS
    onChange(editor.document);
  };

  // ---------- META SAVE ----------
  const saveMeta = useCallback(
    async (payload: any) => {
      try {
        await fetch(`/api/workspaces/${workspaceId}/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Meta save failed", err);
      }
    },
    [workspaceId, documentId],
  );

  return (
    <div className="relative w-full">
      <Card className="h-[calc(100vh-4rem)] flex flex-col border-0 rounded-none shadow-none">
        <CardHeader className="border-b px-4 py-2">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              saveMeta({ title: e.target.value });
            }}
            className="text-xl font-semibold border-0 bg-transparent"
          />

          <Textarea
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              saveMeta({ summary: e.target.value });
            }}
            className="border-0 bg-transparent text-sm"
          />
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-2">
          <BlockNoteView
            editor={editor}
            editable={editable}
            theme={lightTheme}
            onChange={handleChange}
            className={cn("h-full w-full")}
          />
        </CardContent>
      </Card>

      {showMentions && (
        <MentionDropdown
          ref={dropdownRef}
          activeIndex={highlightedIndex}
          items={filteredEntities}
          onHover={setActiveIndex}
          onSelect={(item) => selectMention(item)}
        />
      )}
    </div>
  );
}
