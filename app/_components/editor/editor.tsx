"use client";

import { useEffect, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView, type Theme } from "@blocknote/mantine";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import { useTheme } from "next-themes";

interface EditorProps {
  documentId: string;
  initialContent?: string;
  editable?: boolean;
}

const lightTheme: Theme = {
  colors: {
    editor: {
      text: "#191c25",
      background: "#fcfcfe",
    },
    menu: {
      text: "#191c25",
      background: "#ffffff",
    },
    tooltip: {
      text: "#fafafa",
      background: "#171821",
    },
    hovered: {
      text: "#171821",
      background: "#f3f5fa",
    },
    selected: {
      text: "#fafafa",
      background: "#1c2030",
    },
    disabled: {
      text: "#9ca3b2",
      background: "#f3f5fa",
    },
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
  borderRadius: 14,
  fontFamily:
    'var(--font-geist-sans), "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
};

const darkTheme: Theme = {
  colors: {
    editor: {
      text: "#191c25",
      background: "#fcfcfe",
    },
    menu: {
      text: "#191c25",
      background: "#ffffff",
    },
    tooltip: {
      text: "#fafafa",
      background: "#171821",
    },
    hovered: {
      text: "#171821",
      background: "#f3f5fa",
    },
    selected: {
      text: "#fafafa",
      background: "#1c2030",
    },
    disabled: {
      text: "#9ca3b2",
      background: "#f3f5fa",
    },
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
  borderRadius: 14,
  fontFamily: lightTheme.fontFamily,
};

function parseInitialContent(initialContent?: string) {
  if (!initialContent) return undefined;

  try {
    return JSON.parse(initialContent);
  } catch (error) {
    console.error("Failed to parse editor content:", error);
    return undefined;
  }
}

export default function Editor({
  documentId,
  initialContent,
  editable = true,
}: EditorProps) {
  const { resolvedTheme } = useTheme();
  const [showMentions, setShowMentions] = useState(false);

  const editor = useCreateBlockNote({
    initialContent: parseInitialContent(initialContent),
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDark = resolvedTheme === "dark";
  useEffect(() => {
    if (!editor) return;

    const unsubscribe = editor.on("update", ({ editor }) => {
      const text = editor.getText();

      if (text.endsWith("@")) {
        setShowMentions(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [editor]);

  const handleChange = () => {
    const content = JSON.stringify(editor.document);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentJson: content }),
        });
      } catch (err) {
        console.error("Autosave failed:", err);
      }
    }, 800);
  };

  return (
    <div className="vion-editor-shell w-full px-2 py-2 md:px-3 md:py-3">
      <div
        className={`overflow-hidden rounded-[2rem] border shadow-[0_28px_80px_rgba(28,32,48,0.09)] ${
          isDark
            ? "border-[#e7eaf2] bg-[#fcfcfe]"
            : "border-[#e7eaf2] bg-[#fcfcfe]"
        }`}
      >
        <div
          className={`flex items-center justify-between border-b px-5 py-5 md:px-7 ${
            isDark
              ? "border-[#eceff6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,249,253,0.92)_100%)]"
              : "border-[#eceff6] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,249,253,0.92)_100%)]"
          }`}
        >
          <div
            className="rounded-full border border-[#e8ebf2] bg-white px-3 py-1.5 text-xs font-medium text-[#5f6574]"
          >
            `/` commands
          </div>
        </div>

        <div className="px-3 py-3 md:px-4 md:py-4">
          <BlockNoteView
            editor={editor}
            editable={editable}
            theme={isDark ? darkTheme : lightTheme}
            onChange={handleChange}
            className="vion-blocknote min-h-[78vh]"
            sideMenu={editable}
            slashMenu={editable}
            formattingToolbar={editable}
            linkToolbar={editable}
          />
        </div>
      </div>

      <style jsx global>{`
        .vion-blocknote.bn-container {
          --bn-border: 1px solid var(--bn-colors-border);
          --bn-border-radius-small: 12px;
          --bn-border-radius-medium: 16px;
          --bn-border-radius-large: 22px;
          --bn-shadow-medium: 0 18px 40px rgba(31, 41, 75, 0.08);
        }

        .vion-blocknote .bn-editor {
          min-height: 78vh;
          padding: 1.5rem clamp(0.9rem, 2vw, 1.4rem);
          border: 1px solid #edf0f6;
          border-radius: 1.6rem;
          background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%);
          box-shadow: none;
        }

        .vion-blocknote .bn-editor .ProseMirror {
          min-height: calc(78vh - 4rem);
          max-width: 760px;
          margin: 0 auto;
          padding: 0.5rem 0 8rem;
          font-size: 1.05rem;
          line-height: 1.9;
          color: #1f2330;
        }

        .vion-blocknote
          .bn-editor
          .bn-block-content[data-content-type="heading"] {
          letter-spacing: -0.03em;
        }

        .vion-blocknote
          .bn-block-content[data-content-type="heading"][data-level="1"] {
          font-size: clamp(2.25rem, 4vw, 3.5rem);
          font-weight: 800;
          line-height: 1.05;
          margin-top: 0.35em;
          margin-bottom: 0.35em;
        }

        .vion-blocknote
          .bn-block-content[data-content-type="heading"][data-level="2"] {
          font-size: clamp(1.45rem, 2.2vw, 2rem);
          font-weight: 700;
          line-height: 1.2;
          margin-top: 1.1em;
          margin-bottom: 0.4em;
        }

        .vion-blocknote .bn-block-content[data-content-type="paragraph"] {
          margin-bottom: 0.35em;
        }

        .vion-blocknote
          .bn-block-content:has(.ProseMirror-trailingBreak:only-child):after {
          opacity: 0.65;
          font-style: italic;
        }

        .vion-blocknote .bn-toolbar,
        .vion-blocknote .bn-menu-dropdown,
        .vion-blocknote .bn-suggestion-menu {
          backdrop-filter: blur(10px);
          border: 1px solid #e8ebf2;
          box-shadow: 0 18px 40px rgba(31, 41, 75, 0.08);
        }

        .vion-blocknote .bn-toolbar {
          padding: 0.25rem;
          background: rgba(255, 255, 255, 0.92);
        }

        .vion-blocknote .bn-toolbar .mantine-Button-root,
        .vion-blocknote .bn-toolbar .mantine-ActionIcon-root {
          min-height: 2.25rem;
        }

        .vion-blocknote .bn-suggestion-menu {
          width: min(92vw, 380px);
          padding: 0.25rem;
          background: rgba(255, 255, 255, 0.96);
        }

        .vion-blocknote .bn-suggestion-menu-label {
          padding: 0.5rem 0.625rem 0.25rem;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .vion-blocknote .bn-suggestion-menu-item {
          min-height: 3.4rem;
          border-radius: 8px;
          padding: 0.65rem 0.75rem;
        }

        .vion-blocknote
          .bn-mt-suggestion-menu-item-section[data-position="left"] {
          border: 1px solid #e8ebf2;
          background: #f7f8fc;
          box-shadow: none;
        }

        .vion-blocknote .bn-mt-suggestion-menu-item-title {
          font-size: 0.95rem;
          font-weight: 700;
        }

        .vion-blocknote .bn-mt-suggestion-menu-item-subtitle {
          margin-top: 0.15rem;
          font-size: 0.74rem;
          line-height: 1.35;
          opacity: 0.82;
        }

        .vion-blocknote
          .bn-side-menu
          .mantine-UnstyledButton-root:not(.mantine-Menu-item) {
          border-radius: 999px;
          padding: 0.28rem;
          background: rgba(247, 248, 252, 0.95);
          border: 1px solid #e8ebf2;
          transition:
            background-color 160ms ease,
            transform 160ms ease;
        }

        .vion-blocknote .bn-side-menu .mantine-UnstyledButton-root:hover {
          transform: scale(1.04);
          background: #ffffff;
        }

        .vion-blocknote
          .bn-side-menu
          .mantine-UnstyledButton-root:not(.mantine-Menu-item)
          svg {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 768px) {
          .vion-blocknote .bn-editor {
            min-height: 70vh;
            padding: 1rem 0.75rem;
          }

          .vion-blocknote .bn-editor .ProseMirror {
            min-height: calc(70vh - 2rem);
            font-size: 1rem;
            line-height: 1.75;
          }

          .vion-blocknote .bn-suggestion-menu {
            width: min(94vw, 340px);
          }
        }
      `}</style>
    </div>
  );
}
