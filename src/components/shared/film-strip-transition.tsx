'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

export function FilmStripTransition({ 
  isActive, 
  title,
  onAnimationComplete 
}: { 
  isActive: boolean; 
  title: string;
  onAnimationComplete?: () => void;
}) {
  useEffect(() => {
    if (isActive && onAnimationComplete) {
      // Navigate at 3.5 seconds - after the title has been visible in the center
      const timer = setTimeout(() => {
        onAnimationComplete();
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [isActive, onAnimationComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm"
        >
          {/* Moving Film Strip */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ 
              x: ["100%", "0%", "0%", "-100%"]
            }}
            transition={{
              duration: 4,
              times: [0, 0.3, 0.7, 1], // Pause at center (0%) from 30% to 70% of animation
              ease: ["easeOut", "linear", "easeIn"]
            }}
            className="flex items-center gap-12 whitespace-nowrap"
          >
            {/* We create several "frames" to simulate a moving reel */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="relative group flex flex-col items-center">
                {/* Sprocket Holes Top */}
                <div className="flex gap-2 mb-2">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="w-4 h-6 border border-white/20 rounded-sm bg-black" />
                  ))}
                </div>

                {/* The Frame */}
                <div className="w-[500px] aspect-video border-y-4 border-zinc-800 bg-zinc-900 flex items-center justify-center relative overflow-hidden">
                   {/* If it's the middle frame, show the title */}
                   {i === 3 ? (
                     <div className="text-center px-6 py-4 w-full">
                       <p className="font-mono text-[8px] text-yellow-500 mb-2 tracking-[0.3em]">REEL_04 // FRAME_82</p>
                       <h2 className="text-xl font-black italic uppercase text-white break-words leading-tight px-2">{title}</h2>
                     </div>
                   ) : (
                     <div className="w-full h-full bg-zinc-950/50" />
                   )}
                   
                   {/* Light Leak Overlay */}
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
                </div>

                {/* Sprocket Holes Bottom */}
                <div className="flex gap-2 mt-2">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="w-4 h-6 border border-white/20 rounded-sm bg-black" />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Center Focus Brackets (Visual Guide) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[300px] border-x border-white/10 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-red-600/30" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
