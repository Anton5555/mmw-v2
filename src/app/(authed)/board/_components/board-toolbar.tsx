'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface BoardToolbarProps {
  onCreateClick: () => void;
}

export function BoardToolbar({ onCreateClick }: BoardToolbarProps) {
  return (
    <div className="p-6 border-b border-white/5">
      <Button
        onClick={onCreateClick}
        className="bg-yellow-500 hover:bg-yellow-600 text-black font-black uppercase tracking-[.2em]"
      >
        <Plus className="h-4 w-4" />
        Create Post-It
      </Button>
    </div>
  );
}
