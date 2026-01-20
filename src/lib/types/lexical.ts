// Lexical editor state type definition
export type LexicalEditorState = {
  root: {
    children: Array<{
      children?: Array<unknown>;
      direction: 'ltr' | 'rtl' | null;
      format: string | number;
      indent: number;
      type: string;
      version: number;
      [key: string]: unknown;
    }>;
    direction: 'ltr' | 'rtl' | null;
    format: string;
    indent: number;
    type: string;
    version: number;
  };
  [key: string]: unknown;
};
