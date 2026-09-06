import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  getActiveEdition,
  getUserBallot,
  getOscarCategories,
} from '@/lib/api/oscars';
import { OscarBallotForm } from '@/components/oscars/oscar-ballot-form';
import { OscarSummary } from '@/components/oscars/oscar-summary';
import { OscarSuccessDialog } from '@/components/oscars/oscar-success-dialog';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

export default async function OscarsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const isAdmin = session.user.role === 'admin';

  // Get active edition
  const edition = await getActiveEdition();

  if (!edition) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Suspense fallback={null}>
          <OscarSuccessDialog />
        </Suspense>
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Tus apuestas
            </h1>
            <p className="text-zinc-400 mt-3">
              Buena suerte, {session.user.name}.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/oscars/predictions">
                <Button
                  variant="outline"
                  className="rounded-lg border-white/10 hover:bg-zinc-900"
                >
                  Ver predicciones
                </Button>
              </Link>
              <Link href="/oscars/results">
                <Button
                  variant="outline"
                  className="rounded-lg border-white/10 hover:bg-zinc-900"
                >
                  Ver resultados
                </Button>
              </Link>
              {isAdmin && (
                <Link href="/oscars/admin">
                  <Button
                    variant="outline"
                    className="rounded-lg border-yellow-500/30 hover:bg-yellow-500/10"
                  >
                    Administrar ganadores
                  </Button>
                </Link>
              )}
            </div>
          </header>
          <OscarSummary ballot={userBallot} editionYear={edition.year} />
        </div>
      </div>
    );
  }

  // Get categories with nominees
  const categories = await getOscarCategories(edition.id);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
            Los Oscalos
          </h1>
          <p className="text-zinc-400 mt-3">
            Apostá para la edición {edition.year}.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/oscars/predictions">
              <Button
                variant="outline"
                className="rounded-lg border-white/10 hover:bg-zinc-900"
              >
                Ver predicciones
              </Button>
            </Link>
            <Link href="/oscars/results">
              <Button
                variant="outline"
                className="rounded-lg border-white/10 hover:bg-zinc-900"
              >
                Ver resultados
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/oscars/admin">
                <Button
                  variant="outline"
                  className="rounded-lg border-yellow-500/30 hover:bg-yellow-500/10"
                >
                  Administrar ganadores
                </Button>
              </Link>
            )}
          </div>
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
