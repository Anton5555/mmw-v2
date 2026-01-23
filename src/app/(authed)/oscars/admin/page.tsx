import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActiveEdition, getOscarCategories } from '@/lib/api/oscars';
import { OscarWinnersForm } from '@/components/oscars/oscar-winners-form';

export default async function OscarsAdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  // Check if user is admin
  if (session.user.role !== 'admin') {
    redirect('/oscars');
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

  // Get categories with nominees and current winners
  const categories = await getOscarCategories(edition.id);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter">
            Administrar Ganadores
          </h1>
          <p className="text-zinc-500 mt-2">
            Ingresa los ganadores de la {edition.year}ª edición de los Premios de la Academia.
          </p>
        </header>

        <OscarWinnersForm categories={categories} editionId={edition.id} />
      </div>
    </div>
  );
}
