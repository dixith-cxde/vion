export type EditorBlock = {
  id?: string;
  type: string;
  props?: Record<string, any>;
  content?: any[];
  children?: EditorBlock[];
};
