import { describe, expect, it, vi } from 'vitest';
import type { LexicalEditorState } from '@/lib/types/lexical';
import { deserializeEditorState, serializeEditorState } from './lexical';

const state = { root: { type: 'root', children: [] } } as unknown as LexicalEditorState;

describe('serializeEditorState', () => {
  it.each([null, undefined, ''])('returns empty string for %p', (value) => {
    expect(serializeEditorState(value as never)).toBe('');
  });

  it('passes strings through untouched', () => {
    expect(serializeEditorState('{"already":"json"}')).toBe('{"already":"json"}');
  });

  it('stringifies objects', () => {
    expect(serializeEditorState(state)).toBe(JSON.stringify(state));
  });

  it('returns empty string and logs when serialization fails', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(serializeEditorState(circular as unknown as LexicalEditorState)).toBe('');
    expect(spy).toHaveBeenCalled();
  });
});

describe('deserializeEditorState', () => {
  it.each([null, undefined, '', '   '])('returns null for %p', (value) => {
    expect(deserializeEditorState(value as never)).toBeNull();
  });

  it('round-trips a serialized state', () => {
    expect(deserializeEditorState(serializeEditorState(state))).toEqual(state);
  });

  it('returns null and logs on invalid JSON', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(deserializeEditorState('{not json')).toBeNull();
    expect(spy).toHaveBeenCalled();
  });
});
