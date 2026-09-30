import { redirect } from 'next/navigation';
import {
  getActiveEdition,
  getUserBallot,
  getOscarCategories,
} from '@/lib/api/oscars';
import { OscarBallotForm } from '@/components/oscars/oscar-ballot-form';
import { OscarSummary } from '@/components/oscars/oscar-summary';
import { OscarSuccessDialog } from '@/components/oscars/oscar-success-dialog';
import { BarChart3, Settings2, Trophy } from 'lucide-react';
import {
  SectionNav,
  SectionNavLink,
} from '@/components/shared/section-nav';
import { Suspense } from 'react';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function OscarsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <OscarsPageContent />
    </Suspense>
  );
}

async function OscarsPageContent() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect('/sign-in');
  }

  const isAdmin = session.user.role === 'admin';

  // Get active edition
  const edition = await getActiveEdition();

  if (!edition) {
    return (
      <div className="min-h-svh bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black tracking-tighter">
            No hay edición activa
          </h1>
          <p className="text-muted-foreground">
            No hay ninguna edición de los Oscars disponible en este momento.
          </p>
        </div>
      </div>
    );
  }

  // Check if user already voted
  const userBallot = await getUserBallot(session.user.id, edition.id);

  if (userBallot) {
    return (
      <div className="min-h-svh bg-[#0a0a0a] text-white">
        <Suspense fallback={null}>
          <OscarSuccessDialog />
        </Suspense>
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <header className="mb-12 text-center">
            <h1 className="text-balance text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Tus apuestas
            </h1>
            <p className="text-zinc-400 mt-3">
              Buena suerte, {session.user.name}.
            </p>
            <SectionNav
              aria-label="Secciones de los Oscalos"
              items={isAdmin ? 3 : 2}
              className="mt-6"
            >
              <SectionNavLink href="/oscars/predictions">
                <BarChart3 className="text-zinc-400" />
                <span>Predicciones</span>
              </SectionNavLink>
              <SectionNavLink href="/oscars/results">
                <Trophy className="text-yellow-500" />
                <span>Resultados</span>
              </SectionNavLink>
              {isAdmin && (
                <SectionNavLink href="/oscars/admin">
                  <Settings2 className="text-zinc-400" />
                  <span>Administrar</span>
                </SectionNavLink>
              )}
            </SectionNav>
          </header>
          <OscarSummary ballot={userBallot} editionYear={edition.year} />
        </div>
      </div>
    );
  }

  // Get categories with nominees
  const categories = await getOscarCategories(edition.id);

  return (
    <div className="min-h-svh bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="text-balance text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Los Oscalos
          </h1>
          <p className="text-zinc-400 mt-3">
            Apostá para la edición {edition.year}.
          </p>
          <SectionNav
            aria-label="Secciones de los Oscalos"
            items={isAdmin ? 3 : 2}
            className="mt-6"
          >
            <SectionNavLink href="/oscars/predictions">
              <BarChart3 className="text-zinc-400" />
              <span>Predicciones</span>
            </SectionNavLink>
            <SectionNavLink href="/oscars/results">
              <Trophy className="text-yellow-500" />
              <span>Resultados</span>
            </SectionNavLink>
            {isAdmin && (
              <SectionNavLink href="/oscars/admin">
                <Settings2 className="text-zinc-400" />
                <span>Administrar</span>
              </SectionNavLink>
            )}
          </SectionNav>
        </header>

        <OscarBallotForm
          categories={categories}
          editionId={edition.id}
          ceremonyDate={edition.ceremonyDate}
        />
      </div>
    </div>
  );
}
