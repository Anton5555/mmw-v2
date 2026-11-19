'use client';

export function LoadingSpinner() {
  return (
    <div
      role="status"
      className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background"
    >
      <div className="size-14 rounded-full border-[3px] border-zinc-800 border-t-yellow-500 animate-spin-smooth" />
      <p className="text-sm text-muted-foreground">Cargando…</p>
    </div>
  );
}
