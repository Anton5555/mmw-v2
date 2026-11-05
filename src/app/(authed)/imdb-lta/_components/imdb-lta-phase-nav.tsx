import { ImdbLtaPhase } from '@generated/prisma/client';
import {
  ImdbLtaPhaseNavClient,
  type PhaseNavTab,
} from './imdb-lta-phase-nav-client';

const TABS: Array<{
  href: string;
  label: string;
  match: (path: string) => boolean;
  visible: (phase: ImdbLtaPhase) => boolean;
}> = [
  {
    href: '/imdb-lta',
    label: 'Nominaciones',
    match: (path) => path === '/imdb-lta',
    visible: () => true,
  },
  {
    href: '/imdb-lta/lote',
    label: 'Lote actual',
    match: (path) => path.startsWith('/imdb-lta/lote'),
    visible: (phase) => phase === ImdbLtaPhase.RATING_OPEN,
  },
  {
    href: '/imdb-lta/rate',
    label: 'Revisar',
    match: (path) => path.startsWith('/imdb-lta/rate'),
    visible: (phase) =>
      phase === ImdbLtaPhase.RATING_OPEN ||
      phase === ImdbLtaPhase.RATING_CLOSED,
  },
  {
    href: '/imdb-lta/ranking',
    label: 'Ranking',
    match: (path) => path.startsWith('/imdb-lta/ranking'),
    // Only when everything is done — no peeking mid-season.
    visible: (phase) => phase === ImdbLtaPhase.RATING_CLOSED,
  },
];

type ImdbLtaPhaseNavProps = {
  phase: ImdbLtaPhase;
  currentPath: string;
};

export function ImdbLtaPhaseNav({ phase, currentPath }: ImdbLtaPhaseNavProps) {
  const visibleTabs = TABS.filter((tab) => tab.visible(phase));

  if (visibleTabs.length <= 1 && phase === ImdbLtaPhase.NOMINATION_OPEN) {
    return null;
  }

  const tabs: PhaseNavTab[] = visibleTabs.map(({ href, label }) => ({
    href,
    label,
  }));

  return <ImdbLtaPhaseNavClient tabs={tabs} currentPath={currentPath} />;
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
        body: 'Listo, ya no se puede nominar más. En un rato arrancamos a puntuar por lotes.',
        tone: 'amber',
      };
    case ImdbLtaPhase.RATING_OPEN:
      return {
        title: 'A puntuar',
        body: 'Van saliendo lotes de 10. Entrá al lote actual, puntuá lo que viste y si no la viste, decí “No la vi”.',
        tone: 'emerald',
      };
    case ImdbLtaPhase.RATING_CLOSED:
      return {
        title: 'Ranking oficial',
        body: 'Cerramos los puntajes. Este es el resultado final de IMDB LTA.',
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
