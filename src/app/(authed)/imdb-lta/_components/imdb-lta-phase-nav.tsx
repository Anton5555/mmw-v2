import Link from 'next/link';
import { ImdbLtaPhase } from '@prisma/client';
import { cn } from '@/lib/utils';

const TABS = [
  {
    href: '/imdb-lta',
    label: 'Nominaciones',
    match: (path: string) => path === '/imdb-lta',
    visible: () => true,
  },
  {
    href: '/imdb-lta/rate',
    label: 'Puntuar',
    match: (path: string) => path.startsWith('/imdb-lta/rate'),
    visible: (phase: ImdbLtaPhase) =>
      phase === ImdbLtaPhase.RATING_OPEN ||
      phase === ImdbLtaPhase.RATING_CLOSED,
  },
  {
    href: '/imdb-lta/ranking',
    label: 'Ranking',
    match: (path: string) => path.startsWith('/imdb-lta/ranking'),
    visible: (phase: ImdbLtaPhase) =>
      phase === ImdbLtaPhase.RATING_OPEN ||
      phase === ImdbLtaPhase.RATING_CLOSED,
  },
] as const;

type ImdbLtaPhaseNavProps = {
  phase: ImdbLtaPhase;
  currentPath: string;
};

export function ImdbLtaPhaseNav({ phase, currentPath }: ImdbLtaPhaseNavProps) {
  const visibleTabs = TABS.filter((tab) => tab.visible(phase));

  if (visibleTabs.length <= 1 && phase === ImdbLtaPhase.NOMINATION_OPEN) {
    return null;
  }

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
      {visibleTabs.map((tab) => {
        const active = tab.match(currentPath);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition',
              active
                ? 'bg-yellow-500 text-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function phaseBannerCopy(phase: ImdbLtaPhase): {
  title: string;
  body: string;
  tone: 'amber' | 'emerald' | 'blue' | 'zinc';
} | null {
  switch (phase) {
    case ImdbLtaPhase.NOMINATION_OPEN:
      return null;
    case ImdbLtaPhase.NOMINATION_CLOSED:
      return {
        title: 'Nominaciones cerradas',
        body: 'El universo de candidatas está congelado. Pronto se abrirán las puntuaciones.',
        tone: 'amber',
      };
    case ImdbLtaPhase.RATING_OPEN:
      return {
        title: 'Puntuaciones abiertas',
        body: 'Puntuá películas candidatas del 0 al 10. El ranking se actualiza en vivo (provisional).',
        tone: 'emerald',
      };
    case ImdbLtaPhase.RATING_CLOSED:
      return {
        title: 'Ranking oficial',
        body: 'Las puntuaciones están cerradas. El ranking de IMDB LTA es el resultado final.',
        tone: 'blue',
      };
    default:
      return {
        title: String(phase),
        body: '',
        tone: 'zinc',
      };
  }
}
