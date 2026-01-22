'use client';

export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 relative overflow-hidden">
      {/* Cinematic Film Grain Overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] animate-grain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          width: '400%',
          height: '400%',
          left: '-150%',
          top: '-150%',
        }}
      />

      <div className="relative flex flex-col items-center justify-center z-10">
        <div className="relative flex items-center justify-center w-20 h-20">
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-yellow-500/20 blur-xl animate-pulse-glow" />

          {/* The Actual Spinner */}
          <div className="w-16 h-16 rounded-full border-[3px] border-zinc-800 border-t-yellow-500 border-r-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)] animate-spin-smooth" />

          {/* Static Center Point */}
          <div className="absolute w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
        </div>

        {/* Subtle Loading Text */}
        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
          Accediendo al VIP...
        </p>
      </div>
    </div>
  );
}
