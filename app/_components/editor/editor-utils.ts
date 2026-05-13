import { Block } from "@blocknote/core";
import { type Theme } from "@blocknote/mantine";

export type MentionEntityType = "TASK" | "DOCUMENT" | "USER";

export interface MentionEntity {
  id: string;
  label: string;
  type: MentionEntityType;
}

interface EntityApiItem {
  id: string;
  title: string;
}

interface EntityApiResponse {
  data?: EntityApiItem[];
}

type MemberSummary = {
  id: string;
  name: string | null;
  email: string | null;
};

interface MemberApiItem {
  user?: MemberSummary;
  id?: string;
  name?: string | null;
  email?: string | null;
}

interface MemberApiResponse {
  data?: MemberApiItem[];
}

interface TextContent {
  type: string;
  text?: string;
  href?: string;
  styles?: Record<string, unknown>;
  content?: TextContent[];
}

export interface EditorBlock {
  content?: TextContent[];
  [key: string]: unknown;
}

const emptyTextContent: TextContent = {
  type: "text",
  text: "",
  styles: {},
};

export const lightTheme: Theme = {
  colors: {
    editor: { text: "#191c25", background: "transparent" },
    menu: { text: "#191c25", background: "#ffffff" },
    tooltip: { text: "#fafafa", background: "#171821" },
    hovered: { text: "#171821", background: "#f3f5fa" },
    selected: { text: "#fafafa", background: "#1c2030" },
    disabled: { text: "#9ca3b2", background: "#f3f5fa" },
    shadow: "#d8ddea",
    border: "#e7eaf2",
    sideMenu: "#7d8394",
    highlights: {
      gray: { text: "#2b3140", background: "#f2f4f8" },
      brown: { text: "#564b43", background: "#f4f1ee" },
      red: { text: "#8f2d2d", background: "#fdf1f1" },
      orange: { text: "#99542b", background: "#fff4eb" },
      yellow: { text: "#86652a", background: "#fdf8e8" },
      green: { text: "#2d6a4f", background: "#eef8f2" },
      blue: { text: "#284b8f", background: "#eef4ff" },
      purple: { text: "#65538f", background: "#f4f0ff" },
      pink: { text: "#94506f", background: "#fdf0f6" },
    },
  },
  borderRadius: 10,
  fontFamily:
    'var(--font-poppins), "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
};

export const darkTheme: Theme = lightTheme;

function sanitizeBlocks(blocks: EditorBlock[]) {
  return blocks.map((block) => ({
    ...block,
    content:
      block.content && block.content.length > 0
        ? block.content
        : [emptyTextContent],
  }));
}

export function parseInitialContent(initialContent?: Block[] | string) {
  const emptyDoc = [{ type: "paragraph", content: [] }];
  try {
    if (!initialContent) return emptyDoc;
    if (typeof initialContent === "string") {
      const parsed = JSON.parse(initialContent);
      return Array.isArray(parsed) ? parsed : emptyDoc;
    }
    if (Array.isArray(initialContent)) return initialContent;
    return emptyDoc;
  } catch {
    return emptyDoc;
  }
}

export function extractTextFromDocument(doc: EditorBlock[]): string {
  return doc
    .map(
      (block) =>
        block.content?.map((content) => content.text ?? "").join("") ?? "",
    )
    .join("\n");
}

export function extractTextFromBlock(block?: EditorBlock) {
  return block?.content?.map((content) => content.text ?? "").join("") ?? "";
}

export function getMentionQueryAtCursor() {
  if (typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const anchorNode = selection.anchorNode;
  if (!anchorNode) return null;
  const anchorElement =
    anchorNode.nodeType === Node.ELEMENT_NODE
      ? (anchorNode as HTMLElement)
      : anchorNode.parentElement;
  const blockElement = anchorElement?.closest(
    ".bn-editor [data-content-type], .bn-editor .bn-block-content",
  );
  if (!blockElement) return null;
  const textRange = range.cloneRange();
  textRange.selectNodeContents(blockElement);
  textRange.setEnd(range.endContainer, range.endOffset);
  const textBeforeCursor = textRange.toString();
  const match = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
  return match ? match[1] : null;
}

export function getMentionQuery(text: string) {
  const words = text.split(/\s+/);
  const lastWord = words[words.length - 1] ?? "";
  if (!lastWord.startsWith("@")) return null;
  return lastWord.slice(1);
}

export function normalizeEntities(
  tasks: EntityApiResponse,
  documents: EntityApiResponse,
  members?: MemberApiResponse,
): MentionEntity[] {
  return [
    ...(members?.data ?? []).map((member) => ({
      id: member.user?.id ?? member.id ?? "",
      label:
        member.user?.name ||
        member.user?.email ||
        member.name ||
        member.email ||
        "Unknown",
      type: "USER" as const,
    })),
    ...(tasks.data ?? []).map((task) => ({
      id: task.id,
      label: task.title,
      type: "TASK" as const,
    })),
    ...(documents.data ?? []).map((doc) => ({
      id: doc.id,
      label: doc.title,
      type: "DOCUMENT" as const,
    })),
  ].filter((entity) => entity.id.length > 0);
}

export function getMentionPath(
  item: MentionEntity,
  workspaceId?: string | null,
): string {
  const basePath = workspaceId ? `/workspaces/${workspaceId}` : "";
  return `${basePath}/${item.type === "TASK" ? "tasks" : item.type === "USER" ? "members" : "documents"}/${item.id}`;
}

export function getMentionStyles(type: MentionEntityType) {
  if (type === "TASK") return { textColor: "#5b21b6", backgroundColor: "#ede9fe" };
  if (type === "DOCUMENT") return { textColor: "#0369a1", backgroundColor: "#e0f2fe" };
  if (type === "USER") return { textColor: "#15803d", backgroundColor: "#dcfce7" };
  return { textColor: "#1f2937", backgroundColor: "#e5e7eb" };
}

export function getMentionBackgroundColor(
  type: MentionEntityType,
): "blue" | "purple" {
  return type === "TASK" ? "blue" : "purple";
}

export function replaceMentionTokenInBlock(
  block: Block,
  item: MentionEntity,
  mentionQuery: string,
  workspaceId?: string | null,
): Block["content"] {
  const content = Array.isArray(block.content) ? block.content : [];
  const token = `@${mentionQuery}`;
  const replacedContent: Block["content"] = [];
  let didReplace = false;

  const mentionPath = getMentionPath(item, workspaceId);
  const styles = getMentionStyles(item.type);

  // No prefix — just the label
  const mentionLabel = item.label;

  for (let i = content.length - 1; i >= 0; i--) {
    const part = content[i];

    if (
      !didReplace &&
      part.type === "text" &&
      typeof part.text === "string" &&
      part.text.includes(token)
    ) {
      const mentionIndex = part.text.lastIndexOf(token);
      const before = part.text.slice(0, mentionIndex);
      const after = part.text.slice(mentionIndex + token.length);

      const replacement: Block["content"] = [];

      if (before) {
        replacement.push({ type: "text", text: before, styles: {} });
      }

      replacement.push({
        type: "link",
        href: mentionPath,
        content: [
          {
            type: "text",
            text: mentionLabel,
            styles: {
              bold: true,
              textColor: styles.textColor,
              backgroundColor: styles.backgroundColor,
            },
          },
        ],
      });

      replacement.push({ type: "text", text: " ", styles: {} });

      if (after.trim()) {
        replacement.push({ type: "text", text: after.trimStart(), styles: {} });
      }

      replacedContent.unshift(...replacement);
      didReplace = true;
      continue;
    }

    replacedContent.unshift(part);
  }

  return didReplace ? replacedContent : content;
}

export function extractMentions(blocks: Block[]) {
  const mentions: { entityType: string; entityId: string }[] = [];

  type MentionNode = {
    type?: string;
    href?: string;
    props?: { entityType?: string; entityId?: string };
    content?: unknown[];
    children?: unknown[];
  };

  function parseMentionHref(href?: string) {
    if (!href) return null;
    const taskMatch = href.match(/\/tasks\/([0-9a-f-]{36})(?:$|[/?#])/i);
    if (taskMatch) return { entityType: "TASK", entityId: taskMatch[1] };
    const documentMatch = href.match(
      /\/documents\/([0-9a-f-]{36})(?:$|[/?#])/i,
    );
    if (documentMatch) return { entityType: "DOCUMENT", entityId: documentMatch[1] };
    return null;
  }

  function walk(nodes: unknown[]) {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const mentionNode = node as MentionNode;
      if (mentionNode.type === "mention") {
        mentions.push({
          entityType: mentionNode.props?.entityType ?? "",
          entityId: mentionNode.props?.entityId ?? "",
        });
      }
      if (mentionNode.type === "link") {
        const parsed = parseMentionHref(
          typeof mentionNode.href === "string" ? mentionNode.href : undefined,
        );
        if (parsed) mentions.push(parsed);
      }
      if (Array.isArray(mentionNode.content)) walk(mentionNode.content);
      if (Array.isArray(mentionNode.children)) walk(mentionNode.children);
    }
  }

  walk(blocks);
  return mentions;
}
