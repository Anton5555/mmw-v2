'use client';

import { useState, useEffect } from 'react';
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
  const [layouts, setLayouts] = useState<Layouts>(() => generateAllLayouts(posts));

  useEffect(() => {
    setLayouts(generateAllLayouts(posts));
  }, [posts]);

  const handleLayoutChange = (_currentLayout: Layout, allLayouts: Layouts) => {
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
          rowHeight={200}
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
