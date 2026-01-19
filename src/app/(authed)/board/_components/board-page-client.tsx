'use client';

import { useState, useEffect, useRef } from 'react';
import { BoardGrid } from './board-grid';
import { BoardToolbar } from './board-toolbar';
import { CreatePostDialog } from './create-post-dialog';
import { EditPostDialog } from './edit-post-dialog';
import { useBoardStream } from '@/lib/hooks/useBoardStream';
import type { BoardPost, BoardEvent } from '@/lib/types/board';
import { toast } from 'sonner';

interface BoardPageClientProps {
  initialPosts: BoardPost[];
  currentUserId: string;
}

export function BoardPageClient({
  initialPosts,
  currentUserId,
}: BoardPageClientProps) {
  const [posts, setPosts] = useState<BoardPost[]>(initialPosts);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPositionsRef = useRef<{ id: string; gridX: number; gridY: number }[] | null>(null);

  const handleBoardEvent = (event: BoardEvent) => {
    if (event.type === 'post-it:created') {
      setPosts((prev) => {
        if (prev.find((p) => p.id === event.data.id)) {
          return prev;
        }
        return [...prev, event.data].sort((a, b) =>
          a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX
        );
      });
    } else if (event.type === 'post-it:updated') {
      setPosts((prev) =>
        prev.map((p) => (p.id === event.data.id ? event.data : p))
      );
    } else if (event.type === 'post-it:deleted') {
      setPosts((prev) => prev.filter((p) => p.id !== event.data.id));
    }
  };

  useBoardStream(handleBoardEvent, true);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const handleCreateSuccess = () => {
    fetch('/api/board')
      .then((res) => res.json())
      .then((newPosts: BoardPost[]) => setPosts(newPosts))
      .catch((error) => console.error('[BoardPageClient] Error fetching posts:', error));
  };

  const handleEdit = (post: BoardPost) => {
    setEditingPost(post);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditingPost(null);
    fetch('/api/board')
      .then((res) => res.json())
      .then((newPosts: BoardPost[]) => setPosts(newPosts))
      .catch((error) => console.error('[BoardPageClient] Error fetching posts:', error));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post-it?')) {
      return;
    }

    try {
      const response = await fetch(`/api/board?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete post');
      }

      toast.success('Post-It deleted successfully');
    } catch (error) {
      console.error('Post deletion error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error deleting post'
      );
    }
  };

  const handlePositionsChange = (positions: { id: string; gridX: number; gridY: number }[]) => {
    pendingPositionsRef.current = positions;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const positionsToSave = pendingPositionsRef.current;
      if (!positionsToSave) return;

      try {
        const response = await fetch('/api/board', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(positionsToSave),
        });

        if (!response.ok) {
          throw new Error('Failed to update positions');
        }

        setPosts((prev) => {
          const posMap = new Map(positionsToSave.map((p) => [p.id, p]));
          return prev.map((post) => {
            const newPos = posMap.get(post.id);
            if (newPos) {
              return { ...post, gridX: newPos.gridX, gridY: newPos.gridY };
            }
            return post;
          });
        });
      } catch (error) {
        console.error('[BoardPageClient] Error saving positions:', error);
        toast.error('Failed to save grid positions');
      } finally {
        saveTimeoutRef.current = null;
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-auto">
      <BoardToolbar onCreateClick={() => setCreateDialogOpen(true)} />

      <BoardGrid
        posts={posts}
        currentUserId={currentUserId}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPositionsChange={handlePositionsChange}
      />

      <CreatePostDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <EditPostDialog
        post={editingPost}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingPost(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
