import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function OscarsResultsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter bg-linear-to-b from-white to-zinc-500 bg-clip-text text-transparent">
            Predicciones Globales
          </h1>
          <p className="text-zinc-400 mt-4 text-lg">
            Estadísticas y resultados de Los Oscalos.
          </p>
        </header>

        <div className="text-center py-12">
          <p className="text-zinc-500">
            Esta página estará disponible después de la ceremonia.
          </p>
        </div>
      </div>
    </div>
  );
}
