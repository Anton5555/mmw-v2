import type { LexicalEditorState } from './lexical';

export type BoardPost = {
  id: string;
  title: string;
  description: string; // Serialized Lexical editor state as JSON string
  order: number; // Position in ordered list (0, 1, 2, ...)
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

export type BoardPostCreateInput = {
  title: string;
  description: string; // Serialized Lexical editor state
};

export type BoardPostUpdateInput = {
  title?: string;
  description?: string; // Serialized Lexical editor state
};

export type BoardPostReorderUpdate = {
  id: string;
  order: number;
}[];

export type BoardEvent =
  | {
      type: 'post-it:created';
      data: BoardPost;
    }
  | {
      type: 'post-it:updated';
      data: BoardPost;
    }
  | {
      type: 'post-it:deleted';
      data: { id: string };
    };
