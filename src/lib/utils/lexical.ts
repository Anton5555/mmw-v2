import type { LexicalEditorState } from '@/lib/types/lexical';

/**
 * Serialize Lexical editor state to JSON string for database storage
 */
export function serializeEditorState(
  editorState: LexicalEditorState | string | null | undefined
): string {
  if (!editorState) {
    return '';
  }

  // If already a string, return as is (might be already serialized)
  if (typeof editorState === 'string') {
    return editorState;
  }

  try {
    return JSON.stringify(editorState);
  } catch (error) {
    console.error('[serializeEditorState] Error serializing editor state:', error);
    return '';
  }
}

/**
 * Deserialize JSON string from database back to Lexical editor state
 */
export function deserializeEditorState(
  jsonString: string | null | undefined
): LexicalEditorState | null {
  if (!jsonString || jsonString.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonString);
    return parsed as LexicalEditorState;
  } catch (error) {
    console.error('[deserializeEditorState] Error parsing editor state:', error);
    return null;
  }
}
