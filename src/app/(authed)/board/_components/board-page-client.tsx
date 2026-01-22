'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BoardGrid } from './board-grid';
import { BoardToolbar } from './board-toolbar';
import { CreatePostDialog } from './create-post-dialog';
import { EditPostDialog } from './edit-post-dialog';
import { DeletePostDialog } from './delete-post-dialog';
import { useBoardStream } from '@/lib/hooks/useBoardStream';
import type { BoardPost, BoardEvent } from '@/lib/types/board';
import { toast } from 'sonner';
import { reorderBoardPostsAction } from '@/lib/actions/board/reorder-board-posts';

interface BoardPageClientProps {
  initialPosts: BoardPost[];
  currentUserId: string;
}

export function BoardPageClient({
  initialPosts,
  currentUserId,
}: BoardPageClientProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<BoardPost[]>(initialPosts);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<BoardPost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReorderRef = useRef<string[] | null>(null);

  const handleBoardEvent = (event: BoardEvent) => {
    if (event.type === 'post-it:created') {
      setPosts((prev) => {
        if (prev.find((p) => p.id === event.data.id)) {
          return prev;
        }
        return [...prev, event.data].sort((a, b) => a.order - b.order);
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
    router.refresh();
  };

  const handleEdit = (post: BoardPost) => {
    setEditingPost(post);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditingPost(null);
    router.refresh();
  };

  const handleDelete = (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (post) {
      setDeletingPost(post);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteSuccess = () => {
    setDeletingPost(null);
    router.refresh();
  };

  const handleReorder = (orderedIds: string[]) => {
    pendingReorderRef.current = orderedIds;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Optimistically update local state
    setPosts((prev) => {
      const postMap = new Map(prev.map((p) => [p.id, p]));
      return orderedIds.map((id, index) => {
        const post = postMap.get(id);
        return post ? { ...post, order: index } : post!;
      });
    });

    saveTimeoutRef.current = setTimeout(async () => {
      const orderedIdsToSave = pendingReorderRef.current;
      if (!orderedIdsToSave) return;

      try {
        // Create update payload: [{ id, order }, ...]
        const updates = orderedIdsToSave.map((id, order) => ({
          id,
          order,
        }));

        await reorderBoardPostsAction(updates);
        router.refresh();
      } catch (error) {
        console.error('[BoardPageClient] Error saving order:', error);
        toast.error('Error al guardar el orden del tablero');
        // Revert by refreshing server data
        router.refresh();
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
        onReorder={handleReorder}
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

      <DeletePostDialog
        post={deletingPost}
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeletingPost(null);
        }}
        onDeleted={handleDeleteSuccess}
      />
    </div>
  );
}
