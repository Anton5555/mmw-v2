import Image from 'next/image';
import { ChevronDown, Film } from 'lucide-react';

export type AdminRatingsView = {
  movieCount: number;
  totalRatings: number;
  voterCount: number;
  movies: {
    id: number;
    title: string;
    originalTitle: string;
    posterUrl: string;
    imdbId: string;
    ratingCount: number;
    averageScore: number | null;
    votes: {
      userId: string;
      name: string;
      score: number;
      votedAt: string;
    }[];
  }[];
  people: {
    userId: string;
    name: string;
    ratingCount: number;
    averageScore: number;
    ratings: {
      movieId: number;
      title: string;
      score: number;
      votedAt: string;
    }[];
  }[];
};

function posterSrc(posterUrl: string) {
  if (!posterUrl) return '';
  return posterUrl.startsWith('http')
    ? posterUrl
    : `https://image.tmdb.org/t/p/w185${posterUrl}`;
}

function formatAverage(score: number | null) {
  if (score === null) return 'Sin puntaje';
  return score.toFixed(1);
}

function scoreCountLabel(count: number) {
  return count === 1 ? '1 puntaje' : `${count} puntajes`;
}

export function ImdbLtaAdminRatings({
  snapshot,
}: {
  snapshot: AdminRatingsView;
}) {
  return (
    <div className="space-y-10">
      <p className="text-sm text-yellow-200/80">
        {snapshot.movieCount} películas · {snapshot.totalRatings} puntajes ·{' '}
        {snapshot.voterCount} personas
      </p>

      <section className="space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
          Películas
        </h2>
        {snapshot.movies.length === 0 ? (
          <p className="text-sm text-zinc-500">Sin películas aún.</p>
        ) : (
          <ul className="space-y-2">
            {snapshot.movies.map((movie) => {
              const src = posterSrc(movie.posterUrl);
              return (
                <li key={movie.id}>
                  <details className="group rounded-xl border border-white/10 bg-zinc-950/50">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-2 [&::-webkit-details-marker]:hidden">
                      <span className="relative block h-14 w-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                        {src ? (
                          <Image
                            src={src}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <Film className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-zinc-600" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-zinc-100">
                          {movie.title}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {movie.originalTitle} · {movie.imdbId}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-black tabular-nums text-yellow-300">
                          {formatAverage(movie.averageScore)}
                        </span>
                        <span className="block text-[11px] text-zinc-500">
                          {scoreCountLabel(movie.ratingCount)}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                    </summary>
                    {movie.votes.length === 0 ? (
                      <p className="border-t border-white/10 px-3 py-2 text-xs text-zinc-500">
                        Sin puntajes.
                      </p>
                    ) : (
                      <ul className="divide-y divide-white/5 border-t border-white/10">
                        {movie.votes.map((vote) => (
                          <li
                            key={vote.userId}
                            className="flex items-center gap-3 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-zinc-200">{vote.name}</p>
                              <p className="text-[11px] text-zinc-500">
                                {vote.votedAt}
                              </p>
                            </div>
                            <span className="w-6 shrink-0 text-right font-black tabular-nums text-yellow-300">
                              {vote.score}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
          Personas
        </h2>
        {snapshot.voterCount === 0 ? (
          <p className="text-sm text-zinc-500">Nadie puntuó todavía.</p>
        ) : (
          <ul className="space-y-2">
            {snapshot.people.map((person) => (
              <li key={person.userId}>
                <details className="group rounded-xl border border-white/10 bg-zinc-950/50">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                      {person.name}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {formatAverage(person.averageScore)} ·{' '}
                      {scoreCountLabel(person.ratingCount)}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <ul className="divide-y divide-white/5 border-t border-white/10">
                    {person.ratings.map((rating) => (
                      <li
                        key={rating.movieId}
                        className="flex items-center gap-3 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-zinc-200">{rating.title}</p>
                          <p className="text-[11px] text-zinc-500">
                            {rating.votedAt}
                          </p>
                        </div>
                        <span className="w-6 shrink-0 text-right font-black tabular-nums text-yellow-300">
                          {rating.score}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
