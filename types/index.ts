export type EditorBlock = {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown[];
  children?: EditorBlock[];
};
export type SaveState = "saved" | "idle" | "saving" | "error";
