import { ImdbLtaPhase } from '@generated/prisma/client';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { TabNav } from '@/components/shared/tab-nav';
import { cn } from '@/lib/utils';

const TABS: Array<{
  href: string;
  label: string;
  admin?: boolean;
  visible: (phase: ImdbLtaPhase, isAdmin: boolean) => boolean;
}> = [
  {
    href: '/imdb-lta',
    label: 'Nominaciones',
    // Builder stays during nomination phases; during rating personal lists live on Revisar.
    visible: (phase) =>
      phase === ImdbLtaPhase.NOMINATION_OPEN ||
      phase === ImdbLtaPhase.NOMINATION_CLOSED,
  },
  {
    href: '/imdb-lta/lote',
    label: 'Lote actual',
    visible: (phase) => phase === ImdbLtaPhase.RATING_OPEN,
  },
  {
    href: '/imdb-lta/rate',
    label: 'Revisar',
    visible: (phase) =>
      phase === ImdbLtaPhase.RATING_OPEN ||
      phase === ImdbLtaPhase.RATING_CLOSED,
  },
  {
    href: '/imdb-lta/stats',
    label: 'Estadísticas',
    visible: (phase) =>
      phase === ImdbLtaPhase.RATING_OPEN ||
      phase === ImdbLtaPhase.RATING_CLOSED,
  },
  {
    href: '/imdb-lta/ranking',
    label: 'Ranking',
    // Only when everything is done — no peeking mid-season.
    visible: (phase) => phase === ImdbLtaPhase.RATING_CLOSED,
  },
  {
    href: '/imdb-lta/admin',
    label: 'Admin',
    admin: true,
    visible: (_phase, isAdmin) => isAdmin,
  },
  {
    href: '/imdb-lta/admin/trivia',
    label: 'Trivia',
    admin: true,
    visible: (_phase, isAdmin) => isAdmin,
  },
];

type ImdbLtaPhaseNavProps = {
  phase: ImdbLtaPhase;
  currentPath: string;
  isAdmin?: boolean;
};

function isActiveTab(href: string, currentPath: string, hrefs: string[]) {
  if (href === '/imdb-lta') return currentPath === '/imdb-lta';
  if (currentPath !== href && !currentPath.startsWith(`${href}/`)) return false;
  // A longer tab that also matches wins (/imdb-lta/admin/trivia over /admin).
  return !hrefs.some(
    (other) =>
      other.length > href.length &&
      (currentPath === other || currentPath.startsWith(`${other}/`))
  );
}

export function ImdbLtaPhaseNav({
  phase,
  currentPath,
  isAdmin = false,
}: ImdbLtaPhaseNavProps) {
  const visibleTabs = TABS.filter((tab) => tab.visible(phase, isAdmin));
  const hrefs = visibleTabs.map((tab) => tab.href);
  const memberTabs = visibleTabs.filter((tab) => !tab.admin);
  const adminTabs = visibleTabs.filter((tab) => tab.admin);

  // One member tab and nothing else: there is nothing to switch to.
  if (memberTabs.length <= 1 && adminTabs.length === 0) {
    return null;
  }

  return (
    <TabNav
      className="mb-6 sm:mb-8"
      label="Secciones de IMDB LTA"
      items={memberTabs.map((tab) => ({
        href: tab.href,
        label: tab.label,
        active: isActiveTab(tab.href, currentPath, hrefs),
      }))}
      trailing={
        adminTabs.length > 0 ? (
          <>
            <span className="flex items-center text-muted-foreground" title="Solo admins">
              <ShieldCheck className="size-4" aria-hidden />
              <span className="sr-only">Solo admins:</span>
            </span>
            {adminTabs.map((tab) => {
              const active = isActiveTab(tab.href, currentPath, hrefs);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center whitespace-nowrap px-2 py-3 text-xs transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                    active
                      ? 'font-semibold text-foreground shadow-[inset_0_-3px_0_hsl(var(--primary))]'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </>
        ) : undefined
      }
    />
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
