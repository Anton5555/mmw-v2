import Image from 'next/image';
import { Film, Star, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ImdbLtaPhase } from '@prisma/client';
import { getImdbLtaPhase, listOfficialRanking } from '@/lib/api/imdb-lta';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ImdbLtaPhaseNav } from '../_components/imdb-lta-phase-nav';

function posterSrc(posterUrl: string) {
  if (!posterUrl) return '';
  return posterUrl.startsWith('http')
    ? posterUrl
    : `https://image.tmdb.org/t/p/w500${posterUrl}`;
}

export default async function ImdbLtaRankingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const phase = await getImdbLtaPhase();

  if (
    phase !== ImdbLtaPhase.RATING_OPEN &&
    phase !== ImdbLtaPhase.RATING_CLOSED
  ) {
    redirect('/imdb-lta');
  }

  const { movies, isFinal } = await listOfficialRanking();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <ImdbLtaPhaseNav phase={phase} currentPath="/imdb-lta/ranking" />

        <header className="mb-8 space-y-3">
          <h1 className="flex items-center gap-2 text-3xl font-black uppercase italic tracking-tight">
            <Trophy className="h-7 w-7 text-yellow-500" />
            Ranking IMDB LTA
          </h1>
          {isFinal ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/40 p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-blue-300">
                Ranking oficial
              </p>
              <p className="mt-1 text-sm text-blue-200/80">
                Las puntuaciones están cerradas. Este es el resultado final de
                IMDB LTA.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-950/40 p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-amber-300">
                Ranking provisional (en vivo)
              </p>
              <p className="mt-1 text-sm text-amber-200/80">
                Solo películas con al menos 5 puntajes. El orden puede cambiar
                hasta que se cierren las puntuaciones.
              </p>
            </div>
          )}
          <p className="text-xs text-zinc-500">
            Orden: promedio DESC · empate por cantidad de puntajes · luego
            título. Las nominaciones no suman puntos.
          </p>
        </header>

        {movies.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
            <Trophy className="mx-auto mb-4 h-10 w-10 text-zinc-600" />
            <p className="text-sm text-zinc-400">
              Todavía no hay películas calificadas (5+ puntajes).
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {movies.map((movie) => {
              const src = posterSrc(movie.posterUrl);
              return (
                <li
                  key={movie.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950/60 p-3"
                >
                  <span className="w-10 shrink-0 text-center font-black italic text-yellow-500">
                    #{movie.rank}
                  </span>
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-900">
                    {src ? (
                      <Image
                        src={src}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        sizes="56px"
                        unoptimized
                      />
                    ) : (
                      <Film className="m-auto mt-6 h-5 w-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase italic">
                      {movie.title}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {movie.originalTitle}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20">
                        <Star className="mr-1 h-3 w-3 fill-yellow-400" />
                        {movie.averageScore.toFixed(2)} / 10
                      </Badge>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                        {movie.ratingCount}{' '}
                        {movie.ratingCount === 1 ? 'puntaje' : 'puntajes'}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
