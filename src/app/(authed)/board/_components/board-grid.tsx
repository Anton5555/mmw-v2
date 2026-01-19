'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { PostItCard } from './post-it-card';
import type { BoardPost } from '@/lib/types/board';
import 'react-grid-layout/css/styles.css';

interface BoardGridProps {
  posts: BoardPost[];
  currentUserId?: string;
  onEdit: (post: BoardPost) => void;
  onDelete: (id: string) => void;
  onPositionsChange: (positions: { id: string; gridX: number; gridY: number }[]) => void;
}

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 4, md: 3, sm: 2, xs: 1, xxs: 1 };

type Layouts = Partial<Record<string, Layout>>;

function generateLgLayout(posts: BoardPost[]): Layout {
  return posts.map((post) => ({
    i: post.id,
    x: post.gridX,
    y: post.gridY,
    w: 1,
    h: 1,
  }));
}

function deriveLayout(posts: BoardPost[], cols: number): Layout {
  const sorted = [...posts].sort((a, b) =>
    a.gridY !== b.gridY ? a.gridY - b.gridY : a.gridX - b.gridX
  );
  return sorted.map((post, i) => ({
    i: post.id,
    x: i % cols,
    y: Math.floor(i / cols),
    w: 1,
    h: 1,
  }));
}

function generateAllLayouts(posts: BoardPost[]): Layouts {
  return {
    lg: generateLgLayout(posts),
    md: deriveLayout(posts, COLS.md),
    sm: deriveLayout(posts, COLS.sm),
    xs: deriveLayout(posts, COLS.xs),
    xxs: deriveLayout(posts, COLS.xxs),
  };
}

export function BoardGrid({
  posts,
  currentUserId,
  onEdit,
  onDelete,
  onPositionsChange,
}: BoardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  
  // Compute expected layouts from posts
  const expectedLayouts = useMemo(() => generateAllLayouts(posts), [posts]);
  
  const [layouts, setLayouts] = useState<Layouts>(expectedLayouts);
  const expectedLayoutsRef = useRef<Layouts>(expectedLayouts);
  const isInitialMountRef = useRef(true);

  // Sync layouts when expected layouts change (when posts change programmatically)
  // We defer the state update using requestAnimationFrame to avoid cascading render warnings
  // while still maintaining correct synchronization with react-grid-layout
  useEffect(() => {
    // Skip on initial mount since state is already initialized
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      expectedLayoutsRef.current = expectedLayouts;
      return;
    }

    // Only update if expected layouts actually changed
    const layoutsChanged = JSON.stringify(expectedLayouts.lg) !== JSON.stringify(expectedLayoutsRef.current.lg);
    
    if (layoutsChanged) {
      expectedLayoutsRef.current = expectedLayouts;
      // Use requestAnimationFrame to defer state update and avoid cascading renders warning
      // This still syncs the layout correctly on the next frame
      const rafId = requestAnimationFrame(() => {
        setLayouts(expectedLayouts);
      });
      
      return () => cancelAnimationFrame(rafId);
    }
  }, [expectedLayouts]);

  const handleLayoutChange = (_currentLayout: Layout, allLayouts: Layouts) => {
    // Check if this layout change matches the expected layout (programmatic update)
    // If it matches, it's a programmatic update from posts changing, ignore it
    const currentExpected = expectedLayoutsRef.current.lg;
    const changedLayout = allLayouts.lg;
    
    if (currentExpected && changedLayout) {
      const layoutsMatch = JSON.stringify(currentExpected) === JSON.stringify(changedLayout);
      if (layoutsMatch) {
        // This is a programmatic update, just update local state but don't trigger position change
        setLayouts(allLayouts);
        return;
      }
    }
    
    // This is a user-initiated change (drag/resize)
    setLayouts(allLayouts);
    
    const lgLayout = allLayouts.lg;
    if (lgLayout) {
      const positions = lgLayout.map((item) => ({
        id: item.i,
        gridX: item.x,
        gridY: item.y,
      }));
      onPositionsChange(positions);
    }
  };

  return (
    <div ref={containerRef} className="w-full p-6">
      {mounted && (
        <Responsive
          className="layout"
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          width={width}
          rowHeight={280}
          margin={[24, 24]}
          onLayoutChange={handleLayoutChange}
        >
          {posts.map((post) => (
            <div key={post.id} className="h-full">
              <PostItCard
                {...post}
                currentUserId={currentUserId}
                onEdit={() => onEdit(post)}
                onDelete={() => onDelete(post.id)}
              />
            </div>
          ))}
        </Responsive>
      )}
    </div>
  );
}
