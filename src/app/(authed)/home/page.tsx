import { getLists } from '@/lib/api/lists';
import { getNextEvents } from '@/lib/api/events';
import { ListsCarousel } from '@/components/lists-carousel';
import { NextEvents } from '@/app/(authed)/calendar/_components/next-events';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Sparkles } from 'lucide-react';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const verified = (await searchParams).verified === 'true';
  const lists = await getLists();
  const nextEvents = await getNextEvents();

  return (
    <div className="flex flex-col gap-12 pb-20 overflow-x-hidden">
      {/* Hero Section: Immersion over Padding */}
      <section className="relative w-full overflow-hidden">
        <ListsCarousel lists={lists} verified={verified} />
      </section>

      <div className="container mx-auto px-6 lg:px-12">
        <div className="mb-6 flex items-end justify-between border-b border-white/5 pb-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.3em] text-zinc-500">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Próximos Eventos
            </h2>
            <p className="text-2xl font-black italic uppercase tracking-tighter">
              Agenda de la Comunidad
            </p>
          </div>

          <Link href="/calendar">
            <Button
              variant="ghost"
              size="sm"
              className="group text-zinc-400 hover:text-white"
            >
              <Calendar className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
              Ver Calendario Completo
            </Button>
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/30 shadow-2xl backdrop-blur-sm p-8">
          {nextEvents.length > 0 ? (
            <NextEvents events={nextEvents} showTitle={false} />
          ) : (
            <div className="py-12 text-center">
              <p className="text-lg font-medium text-zinc-400">
                No hay eventos próximos en el radar.
              </p>
              <p className="mt-2 text-sm text-zinc-600 italic">
                Crea un nuevo evento desde el calendario para empezar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
