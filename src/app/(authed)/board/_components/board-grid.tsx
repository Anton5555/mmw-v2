'use client';

import { useState, useEffect, useRef } from 'react';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { PostItCard } from './post-it-card';
import type { BoardPost } from '@/lib/types/board';

interface BoardGridProps {
  posts: BoardPost[];
  currentUserId?: string;
  onEdit: (post: BoardPost) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}

export function BoardGrid({
  posts,
  currentUserId,
  onEdit,
  onDelete,
  onReorder,
}: BoardGridProps) {
  // Sort posts by order
  const sortedPosts = [...posts].sort((a, b) => a.order - b.order);
  const [draggedPostId, setDraggedPostId] = useState<string | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);

  // Set up drag monitoring
  useEffect(() => {
    return monitorForElements({
      onDragStart({ source }) {
        setDraggedPostId(source.data.id as string);
      },
      onDrag({ location }) {
        // Find which index we're hovering over
        const element = location.current.dropTargets[0];
        if (element) {
          const index = parseInt(element.data.index as string, 10);
          setDraggedOverIndex(index);
        } else {
          setDraggedOverIndex(null);
        }
      },
      onDrop({ source, location }) {
        const sourceId = source.data.id as string;
        const element = location.current.dropTargets[0];
        
        if (element) {
          const targetIndex = parseInt(element.data.index as string, 10);
          const sourceIndex = sortedPosts.findIndex((p) => p.id === sourceId);
          
          if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
            // Reorder the posts array
            const newOrder = [...sortedPosts];
            const [moved] = newOrder.splice(sourceIndex, 1);
            newOrder.splice(targetIndex, 0, moved);
            
            // Call onReorder with the new order of IDs
            onReorder(newOrder.map((p) => p.id));
          }
        }
        
        setDraggedPostId(null);
        setDraggedOverIndex(null);
      },
    });
  }, [sortedPosts, onReorder]);

  return (
    <div className="w-full p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 *:transition-all *:duration-300 *:ease-in-out">
        {sortedPosts.map((post, index) => (
          <GridItem
            key={post.id}
            post={post}
            index={index}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onDelete={onDelete}
            isDragging={draggedPostId === post.id}
            isDragOver={draggedOverIndex === index && draggedPostId !== post.id}
          />
        ))}
      </div>
    </div>
  );
}

interface GridItemProps {
  post: BoardPost;
  index: number;
  currentUserId?: string;
  onEdit: (post: BoardPost) => void;
  onDelete: (id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function GridItem({
  post,
  index,
  currentUserId,
  onEdit,
  onDelete,
  isDragging,
  isDragOver,
}: GridItemProps) {
  const dragHandleRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Set up draggable on the drag handle (the top bar with three dots)
  useEffect(() => {
    const element = dragHandleRef.current;
    if (!element) return;

    return draggable({
      element,
      getInitialData: () => ({ id: post.id, type: 'post-it' }),
    });
  }, [post.id]);

  // Set up drop target on the container
  useEffect(() => {
    const element = dropRef.current;
    if (!element) return;

    return dropTargetForElements({
      element,
      getData: () => ({ index: String(index) }),
      canDrop: ({ source }) => source.data.id !== post.id,
    });
  }, [index, post.id]);

  return (
    <div
      ref={dropRef}
      className={`h-[280px] transition-all duration-300 ease-in-out ${
        isDragging 
          ? 'opacity-40 scale-[0.96] rotate-1' 
          : 'opacity-100 scale-100 rotate-0 hover:scale-[1.02] hover:-translate-y-1'
      } ${
        isDragOver 
          ? 'ring-2 ring-yellow-500 rounded-lg ring-offset-2 ring-offset-black scale-[1.02] z-10' 
          : ''
      }`}
    >
      <div className="h-full">
        <PostItCard
          {...post}
          currentUserId={currentUserId}
          onEdit={() => onEdit(post)}
          onDelete={() => onDelete(post.id)}
          dragHandleRef={dragHandleRef}
        />
      </div>
    </div>
  );
}
