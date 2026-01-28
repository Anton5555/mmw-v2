import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActiveEdition, getOscarPredictionStats } from '@/lib/api/oscars';
import { OscarPredictionsView } from '@/components/oscars/oscar-predictions-view';

export default async function OscarsPredictionsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const edition = await getActiveEdition();

  if (!edition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4 text-white">
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

  const stats = await getOscarPredictionStats(edition.id);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto max-w-6xl px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-black tracking-tighter md:text-7xl bg-linear-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Predicciones Globales
          </h1>
          <p className="mt-4 text-lg text-zinc-400">
            Lo que la comunidad apuesta en cada categoría. Los Oscalos{' '}
            {edition.year}.
          </p>
        </header>
        <OscarPredictionsView stats={stats} edition={edition} />
      </div>
    </div>
  );
}
