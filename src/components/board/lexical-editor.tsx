'use client';

import * as React from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useEffect, useState } from 'react';
import type { EditorState } from 'lexical';
import { deserializeEditorState, serializeEditorState } from '@/lib/utils/lexical';
import type { LexicalEditorState } from '@/lib/types/lexical';
import { cn } from '@/lib/utils';
import { Bold, Italic, Underline, Heading1, Heading2, Heading3, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  $getSelection, 
  $isRangeSelection, 
  FORMAT_TEXT_COMMAND,
  $createParagraphNode,
  $isElementNode,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $getRoot,
  $createTextNode,
  $isTextNode,
  $isParagraphNode,
} from 'lexical';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const theme = {
  paragraph: 'mb-2 last:mb-0',
  heading: {
    h1: 'text-3xl font-bold mb-2',
    h2: 'text-2xl font-bold mb-2',
    h3: 'text-xl font-bold mb-2',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    link: 'text-blue-400 underline hover:text-blue-300',
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

function LinkDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
}) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onConfirm(url.trim());
      setUrl('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border-white/10 bg-zinc-950/95 backdrop-blur-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Insert Link</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Enter the URL for the link
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-white">URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-white/5 border-white/10 text-white"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-white hover:bg-yellow-500 text-black"
            >
              Insert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarPlugin({ readOnly }: { readOnly?: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);

  const updateToolbar = React.useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    } else {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
    }
  }, []);

  useEffect(() => {
    if (readOnly) return;
    
    const unregisterUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });

    const unregisterCommand = editor.registerCommand(
      FORMAT_TEXT_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      1
    );

    return () => {
      unregisterUpdateListener();
      unregisterCommand();
    };
  }, [editor, updateToolbar, readOnly]);

  const formatText = (format: 'bold' | 'italic' | 'underline') => {
    editor.focus();
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (level: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        const selectedText = selection.getTextContent();
        
        if (selectedText) {
          // Replace selected text with heading-formatted text
          selection.removeText();
          const textNode = $createTextNode(selectedText);
          
          // Apply heading styles via inline styles
          const fontSize = level === 'h1' ? '2rem' : level === 'h2' ? '1.5rem' : '1.25rem';
          textNode.setStyle(`font-size: ${fontSize}; font-weight: bold;`);
          
          const paragraph = $createParagraphNode();
          paragraph.append(textNode);
          selection.insertNodes([paragraph]);
        } else {
          // If no selection, format the current paragraph
          const anchorNode = selection.anchor.getNode();
          let targetNode = $isTextNode(anchorNode) ? anchorNode.getParent() : anchorNode;
          
          if ($isParagraphNode(targetNode)) {
            const text = targetNode.getTextContent();
            const newParagraph = $createParagraphNode();
            const textNode = $createTextNode(text);
            const fontSize = level === 'h1' ? '2rem' : level === 'h2' ? '1.5rem' : '1.25rem';
            textNode.setStyle(`font-size: ${fontSize}; font-weight: bold;`);
            newParagraph.append(textNode);
            targetNode.replace(newParagraph);
          }
        }
      }
    });
    editor.focus();
  };

  const insertLink = (url: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const selectedText = selection.getTextContent();
        if (selectedText) {
          // Insert link as markdown-style text for now
          // Format: [text](url)
          const linkText = `[${selectedText}](${url})`;
          selection.insertText(linkText);
        } else {
          // Insert link text if nothing is selected
          const linkText = url.split('/').pop() || url;
          const linkMarkdown = `[${linkText}](${url})`;
          selection.insertText(linkMarkdown);
        }
      } else {
        // If no selection, insert at cursor
        const linkText = url.split('/').pop() || url;
        const linkMarkdown = `[${linkText}](${url})`;
        const root = $getRoot();
        const paragraph = root.getFirstChild();
        if ($isParagraphNode(paragraph)) {
          const textNode = $createTextNode(linkMarkdown);
          paragraph.append(textNode);
        }
      }
    });
    editor.focus();
  };

  if (readOnly) return null;

  return (
    <>
      <div className="flex items-center gap-1 p-2 border-b border-white/10 bg-white/5 flex-wrap">
        <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
          <Button
            type="button"
            variant={isBold ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            onClick={() => formatText('bold')}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isItalic ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            onClick={() => formatText('italic')}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isUnderline ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            onClick={() => formatText('underline')}
            aria-label="Underline"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            onClick={() => formatHeading('h1')}
            aria-label="Heading 1"
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            onClick={() => formatHeading('h2')}
            aria-label="Heading 2"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-white/10"
            onClick={() => formatHeading('h3')}
            aria-label="Heading 3"
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-white/10"
          onClick={() => setIsLinkDialogOpen(true)}
          aria-label="Insert Link"
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>
      <LinkDialog
        open={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        onConfirm={insertLink}
      />
    </>
  );
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
      <div className={cn('relative rounded-md overflow-hidden', className)}>
        {!readOnly && <ToolbarPlugin readOnly={readOnly} />}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  'min-h-[120px] w-full bg-transparent px-3 py-2 text-sm shadow-xs transition-colors',
                  'focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  readOnly && 'cursor-default',
                  'prose prose-invert max-w-none'
                )}
              />
            }
            placeholder={
              <div className={cn(
                "absolute text-muted-foreground pointer-events-none",
                !readOnly ? "top-11 left-3" : "top-3 left-3"
              )}>
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <OnChangePluginInternal onChange={onChange} />
        {value && <InitializePlugin value={value} />}
      </div>
    </LexicalComposer>
  );
}
