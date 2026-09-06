import { getLists } from '@/lib/api/lists';
import { getNextEvents } from '@/lib/api/events';
import { getDailyRecommendation } from '@/lib/api/daily-recommendation';
import { ListsCarousel } from '@/components/lists-carousel';
import { NextEvents } from '@/app/(authed)/calendar/_components/next-events';
import { DailySpotlight } from '@/components/daily-spotlight';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

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
      <section className="relative w-full overflow-hidden">
        <ListsCarousel lists={lists} verified={verified} />
      </section>

      <section className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-medium text-zinc-400">
                Recomendación del día
              </h2>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {dailyRecommendation ? (
              <DailySpotlight recommendation={dailyRecommendation} />
            ) : (
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-lg font-medium text-zinc-400">
                    No hay recomendación disponible hoy
                  </p>
                  <p className="text-sm text-zinc-600">
                    La recomendación se actualiza diariamente
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-medium text-zinc-400">
                    Próximos eventos
                  </h2>
                  <p className="text-xl font-semibold tracking-tight text-white">
                    Agenda
                  </p>
                </div>
                <Link
                  href="/calendar"
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-yellow-500 transition-colors"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Ver calendario
                </Link>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900 p-6">
                {nextEvents.length > 0 ? (
                  <NextEvents events={nextEvents} showTitle={false} />
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-zinc-400">
                      No hay eventos próximos.
                    </p>
                    <Link
                      href="/calendar"
                      className="mt-3 inline-block text-sm text-yellow-500 hover:text-yellow-400"
                    >
                      Crear un evento
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
