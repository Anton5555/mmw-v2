import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActiveEdition, getUserBallot, getOscarCategories } from '@/lib/api/oscars';
import { OscarBallotForm } from '@/components/oscars/oscar-ballot-form';
import { OscarSummary } from '@/components/oscars/oscar-summary';
import { Badge } from '@/components/ui/badge';

export default async function OscarsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  // Get active edition
  const edition = await getActiveEdition();

  if (!edition) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black tracking-tighter">No hay edición activa</h1>
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
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
              Tus Apuestas
            </h1>
            <p className="text-zinc-500 mt-2">
              Buena suerte, {session.user.name}. Los resultados se actualizarán en vivo (o quizás no, nadie sabe).
            </p>
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
          <Badge className="mb-4 bg-yellow-500 text-black font-bold">
            EVENTO ESPECIAL
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-linear-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            LOS OSCALOS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg">
            Hace tus apuestas para la edición {edition.year} de los Premios de la Academia.
          </p>
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
