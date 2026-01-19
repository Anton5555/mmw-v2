import type { LexicalEditorState } from './lexical';

export type BoardPost = {
  id: string;
  title: string;
  description: string; // Serialized Lexical editor state as JSON string
  gridX: number; // Column position (0-3 for lg)
  gridY: number; // Row position
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

export type BoardPostPositionUpdate = {
  id: string;
  gridX: number;
  gridY: number;
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
