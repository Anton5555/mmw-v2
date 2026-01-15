'use client';

import { motion } from 'motion/react';

interface FilmSlateProps {
  scene: string;
  take: string;
  onAnimationComplete?: () => void;
}

export function FilmSlate({ scene, take, onAnimationComplete }: FilmSlateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md"
    >
      <div className="relative w-96 max-w-[90vw] h-auto min-h-64 bg-zinc-900 border-4 border-white rounded-lg flex flex-col overflow-hidden shadow-2xl">
        
        {/* Top Hinge Bar (Animated) */}
        <motion.div 
          initial={{ rotate: -30, originX: 0, originY: 1 }}
          animate={{ rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 10,
            delay: 0.2 
          }}
          onAnimationComplete={onAnimationComplete}
          className="h-16 w-[120%] bg-zinc-800 border-b-4 border-white flex items-center overflow-hidden"
          style={{ marginLeft: '-10%' }}
        >
          {/* Traditional Slate Stripes */}
          <div className="flex w-full h-full">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="w-12 h-full bg-white skew-x-[45deg] mr-8 first:ml-[-20px]" />
            ))}
          </div>
        </motion.div>

        {/* Slate Body */}
        <div className="flex-1 p-4 pb-6 grid grid-cols-2 gap-4 font-mono text-white uppercase italic">
          <div className="border-r border-white/20 pr-4">
            <p className="text-[10px] text-zinc-500">Prod.</p>
            <p className="text-sm font-bold truncate">MAM_VIP</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500">Roll</p>
            <p className="text-sm font-bold">A01</p>
          </div>
          <div className="col-span-2 border-t border-white/20 pt-2 text-center">
            <p className="text-[10px] text-zinc-500 mb-1">Scene / List</p>
            <p className="text-xl font-black tracking-tighter text-yellow-500 break-words leading-tight px-2">
              {scene}
            </p>
          </div>
          <div className="border-t border-white/20 pt-2">
            <p className="text-[10px] text-zinc-500">Take</p>
            <p className="text-xl font-black">{take}</p>
          </div>
          <div className="border-t border-white/20 pt-2 text-right">
            <p className="text-[10px] text-zinc-500">Dir.</p>
            <p className="text-xs font-bold truncate">YOU</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
