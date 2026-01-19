'use client';

import * as React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import type { EditorState } from 'lexical';
import { deserializeEditorState, serializeEditorState } from '@/lib/utils/lexical';
import type { LexicalEditorState } from '@/lib/types/lexical';
import { cn } from '@/lib/utils';

const theme = {
  paragraph: 'mb-2 last:mb-0',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
  },
};

const initialConfig = {
  namespace: 'BoardPostEditor',
  theme,
  onError: (error: Error) => {
    console.error('[LexicalEditor] Error:', error);
  },
};

interface LexicalEditorProps {
  value?: string; // Serialized editor state string
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

function OnChangePluginInternal({
  onChange,
}: {
  onChange?: (value: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  const handleChange = (editorState: EditorState) => {
    editorState.read(() => {
      const serializedState = editor.getEditorState().toJSON() as LexicalEditorState;
      const serializedString = serializeEditorState(serializedState);
      onChange?.(serializedString);
    });
  };

  return <OnChangePlugin onChange={handleChange} />;
}

function InitializePlugin({ value }: { value?: string }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = React.useState(false);

  useEffect(() => {
    if (value && !initialized) {
      const deserialized = deserializeEditorState(value);
      if (deserialized) {
        try {
          const editorState = editor.parseEditorState(JSON.stringify(deserialized));
          editor.setEditorState(editorState);
          setInitialized(true);
        } catch (error) {
          console.error('[LexicalEditor] Error initializing editor state:', error);
        }
      }
    }
  }, [editor, value, initialized]);

  return null;
}

export function LexicalEditor({
  value,
  onChange,
  placeholder = 'Enter description...',
  className,
  readOnly = false,
}: LexicalEditorProps) {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('relative', className)}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className={cn(
                'min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors',
                'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-50',
                readOnly && 'cursor-default',
                'prose prose-invert max-w-none',
                className
              )}
            />
          }
          placeholder={
            <div className="absolute top-3 left-3 text-muted-foreground pointer-events-none">
              {placeholder}
            </div>
          }
        />
        <HistoryPlugin />
        <OnChangePluginInternal onChange={onChange} />
        {value && <InitializePlugin value={value} />}
      </div>
    </LexicalComposer>
  );
}
