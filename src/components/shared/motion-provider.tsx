'use client';

import { MotionConfig } from 'motion/react';

// Honour the OS "reduce motion" setting for every motion/react component:
// transform/layout animations are skipped, opacity and color still animate.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
