import type { ReactNode } from 'react';

export function InicioCard({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`space-y-4 rounded-3xl border border-border bg-zinc-950/60 p-5 sm:p-6 ${className}`}
    >
      <div className="space-y-0.5">
        <p className="text-xs font-bold text-yellow-400">{eyebrow}</p>
        <h2 className="text-lg font-black uppercase italic tracking-tight text-zinc-100">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}
