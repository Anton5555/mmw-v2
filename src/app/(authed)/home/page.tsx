import { getLists } from '@/lib/api/lists';
import { getNextEvents } from '@/lib/api/events';
import { getDailyRecommendation } from '@/lib/api/daily-recommendation';
import { ListsCarousel } from '@/components/lists-carousel';
import { NextEvents } from '@/app/(authed)/calendar/_components/next-events';
import { DailySpotlight } from '@/components/daily-spotlight';
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
  const dailyRecommendation = await getDailyRecommendation();

  return (
    <div className="flex flex-col gap-16 pb-20 overflow-x-hidden">
      {/* Hero Section: Immersion over Padding */}
      <section className="relative w-full overflow-hidden">
        <ListsCarousel lists={lists} verified={verified} />
      </section>

      {/* SECTION 2: THE CURATED GRID */}
      <section className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* DAILY SPOTLIGHT (8 columns) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-black uppercase tracking-[0.4em] text-yellow-500">
                Recomendación del Día
              </h2>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {dailyRecommendation ? (
              <DailySpotlight recommendation={dailyRecommendation} />
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-4xl border border-white/10 bg-zinc-900 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-zinc-400">
                    No hay recomendación disponible hoy
                  </p>
                  <p className="text-sm text-zinc-600 italic">
                    La recomendación se actualiza diariamente
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* NEXT EVENTS (4 columns) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
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

              {/* Dynamic Call-to-Action below events */}
              <div className="rounded-2xl bg-yellow-500 p-6 text-black">
                <p className="text-[10px] font-black uppercase tracking-widest">
                  ¿Tienes un plan?
                </p>
                <h4 className="text-xl font-black italic uppercase leading-tight mb-4">
                  Organiza el próximo estreno
                </h4>
                <Link href="/calendar">
                  <Button
                    variant="outline"
                    className="w-full border-black/20 bg-black/5 hover:bg-black/10 font-bold uppercase text-[10px]"
                  >
                    Crear Evento
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
