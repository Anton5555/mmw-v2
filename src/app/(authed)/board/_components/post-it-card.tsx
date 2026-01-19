'use client';

import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { deserializeEditorState } from '@/lib/utils/lexical';
import type { BoardPost } from '@/lib/types/board';

// Simple helper to extract plain text from Lexical editor state
function extractPlainText(description: string): string {
  if (!description) return '';
  
  try {
    const deserialized = deserializeEditorState(description);
    if (deserialized?.root?.children) {
      const extractText = (children: Array<{ children?: Array<unknown>; text?: string; [key: string]: unknown }>): string => {
        return children
          .map((child) => {
            if (child.text) {
              return child.text;
            }
            if (child.children && Array.isArray(child.children)) {
              return extractText(child.children as Array<{ children?: Array<unknown>; text?: string; [key: string]: unknown }>);
            }
            return '';
          })
          .join('');
      };
      return extractText(deserialized.root.children as Array<{ children?: Array<unknown>; text?: string; [key: string]: unknown }>);
    }
  } catch (error) {
    console.error('[PostItCard] Error extracting text:', error);
  }
  
  // Fallback to the description string itself
  return description;
}

interface PostItCardProps extends BoardPost {
  currentUserId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PostItCard({
  title,
  description,
  createdBy,
  createdByUser,
  currentUserId,
  onEdit,
  onDelete,
}: PostItCardProps) {
  const isOwner = currentUserId === createdBy;

  return (
    <div className="group relative bg-zinc-900 border border-white/5 rounded-lg overflow-hidden transition-colors hover:border-yellow-500/50">
      {/* Drag Handle - The "Tape" look */}
      <div className="h-6 bg-zinc-800/50 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none">
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-zinc-600" />
          ))}
        </div>
      </div>

      <div className="p-5 space-y-3">
        <h3 className="font-black italic uppercase tracking-tighter text-white">
          {title}
        </h3>
        <div className="text-sm text-zinc-400 font-mono leading-relaxed min-h-[60px]">
          {description ? (
            <p className="whitespace-pre-wrap">{extractPlainText(description)}</p>
          ) : (
            <span className="text-zinc-600 italic">No description</span>
          )}
        </div>
      </div>

      {/* Metadata Footer */}
      <div className="p-3 bg-black/20 border-t border-white/5 flex justify-between items-center">
        <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
          {createdByUser?.name || 'Anonymous'}
        </span>
        {isOwner && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-yellow-500 hover:bg-yellow-500/10"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-red-500 hover:bg-red-500/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
