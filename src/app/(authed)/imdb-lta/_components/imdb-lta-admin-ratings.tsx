'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Film } from 'lucide-react';
import { IMDB_LTA_MIN_RATINGS_TO_QUALIFY } from '@/lib/validations/imdb-lta';
import { cn } from '@/lib/utils';

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

export type AdminLoteView = {
  id: number;
  number: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  movies: {
    id: number;
    title: string;
    originalTitle: string;
    posterUrl: string;
    imdbId: string;
    position: number;
    ratingCount: number;
    averageScore: number | null;
    nominators: { userId: string; name: string }[];
    votes: {
      userId: string;
      name: string;
      score: number;
      votedAt: string;
    }[];
    skips: { userId: string; name: string }[];
  }[];
};

export type AdminPickView = {
  userId: string;
  name: string;
  nominations: { movieId: number; title: string }[];
};

type TabId = 'peliculas' | 'personas' | 'lotes';

type PersonRow = {
  userId: string;
  name: string;
  ratingCount: number;
  averageScore: number | null;
  ratings: AdminRatingsView['people'][number]['ratings'];
  nominations: AdminPickView['nominations'];
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'peliculas', label: 'Películas' },
  { id: 'personas', label: 'Personas' },
  { id: 'lotes', label: 'Lotes' },
];

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

function nominationCountLabel(count: number) {
  return count === 1 ? '1 nominación' : `${count} nominaciones`;
}

function compareName(a: string, b: string) {
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

function mergePeople(
  snapshot: AdminRatingsView,
  picks: AdminPickView[]
): PersonRow[] {
  const picksByUser = new Map(picks.map((pick) => [pick.userId, pick]));
  const rows: PersonRow[] = snapshot.people.map((person) => ({
    userId: person.userId,
    name: person.name,
    ratingCount: person.ratingCount,
    averageScore: person.averageScore,
    ratings: person.ratings,
    nominations: picksByUser.get(person.userId)?.nominations ?? [],
  }));
  const seen = new Set(rows.map((row) => row.userId));
  const extras = picks
    .filter((pick) => !seen.has(pick.userId))
    .map((pick) => ({
      userId: pick.userId,
      name: pick.name,
      ratingCount: 0,
      averageScore: null,
      ratings: [],
      nominations: pick.nominations,
    }));
  return [...rows, ...extras];
}

function overallAverage(snapshot: AdminRatingsView) {
  if (snapshot.totalRatings === 0) return null;
  let sum = 0;
  for (const movie of snapshot.movies) {
    for (const vote of movie.votes) sum += vote.score;
  }
  return sum / snapshot.totalRatings;
}

function defaultLoteId(lotes: AdminLoteView[]) {
  return lotes.find((lote) => lote.status === 'OPEN')?.id ?? lotes[0]?.id ?? null;
}

function Poster({ posterUrl }: { posterUrl: string }) {
  const src = posterSrc(posterUrl);
  return (
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
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-black tabular-nums text-yellow-300">{value}</p>
      {detail ? <p className="text-[11px] text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function NameList({
  people,
  highlightId,
  empty,
}: {
  people: { userId: string; name: string }[];
  highlightId: string;
  empty: string;
}) {
  if (people.length === 0) {
    return <span className="text-zinc-500">{empty}</span>;
  }
  return (
    <>
      {people.map((person, index) => (
        <span key={person.userId}>
          {index > 0 ? ', ' : null}
          <span
            className={
              person.userId === highlightId ? 'font-bold text-yellow-300' : undefined
            }
          >
            {person.name}
          </span>
        </span>
      ))}
    </>
  );
}

function selectClassName() {
  return 'h-9 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 text-sm font-medium normal-case tracking-normal text-zinc-100';
}

export function ImdbLtaAdminRatings({
  snapshot,
  lotes,
  picks,
}: {
  snapshot: AdminRatingsView;
  lotes: AdminLoteView[];
  picks: AdminPickView[];
}) {
  const [tab, setTab] = useState<TabId>('peliculas');
  const [personId, setPersonId] = useState('');
  const [loteId, setLoteId] = useState<number | null>(() => defaultLoteId(lotes));

  const people = mergePeople(snapshot, picks);
  const peopleByName = people.toSorted((a, b) => compareName(a.name, b.name));
  const selected = personId
    ? (people.find((person) => person.userId === personId) ?? null)
    : null;
  const visibleMovies = selected
    ? snapshot.movies.filter((movie) =>
        movie.votes.some((vote) => vote.userId === selected.userId)
      )
    : snapshot.movies;
  const selectedLote =
    lotes.find((lote) => lote.id === loteId) ??
    lotes.find((lote) => lote.status === 'OPEN') ??
    lotes[0] ??
    null;
  const openLote = lotes.find((lote) => lote.status === 'OPEN') ?? null;
  const qualifiedCount = snapshot.movies.filter(
    (movie) => movie.ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY
  ).length;
  const average = overallAverage(snapshot);
  const openRatedCount = openLote
    ? openLote.movies.filter((movie) => movie.ratingCount > 0).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Películas" value={String(snapshot.movieCount)} />
        <Stat label="Puntajes" value={String(snapshot.totalRatings)} />
        <Stat
          label="Personas"
          value={String(snapshot.voterCount)}
          detail={
            picks.length > 0 ? `${picks.length} nominaron` : undefined
          }
        />
        <Stat
          label="Calificadas"
          value={String(qualifiedCount)}
          detail={`≥${IMDB_LTA_MIN_RATINGS_TO_QUALIFY} puntajes`}
        />
        <Stat label="Promedio" value={formatAverage(average)} />
        <Stat
          label="Lote abierto"
          value={openLote ? `#${openLote.number}` : 'Sin lote'}
          detail={
            openLote
              ? `${openRatedCount}/${openLote.movies.length} con puntaje`
              : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div
          role="tablist"
          aria-label="Secciones"
          className="flex rounded-xl border border-white/10 bg-zinc-950/50 p-1 sm:shrink-0"
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  'rounded-lg px-3 py-2 text-[11px] font-black uppercase tracking-widest',
                  active
                    ? 'bg-yellow-500/15 text-yellow-300'
                    : 'text-zinc-400 hover:text-zinc-200'
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Persona
          <select
            value={selected?.userId ?? ''}
            onChange={(event) => setPersonId(event.target.value)}
            className={selectClassName()}
          >
            <option value="">Todas</option>
            {peopleByName.map((person) => (
              <option key={person.userId} value={person.userId}>
                {person.name}
              </option>
            ))}
          </select>
        </label>

        {tab === 'lotes' && lotes.length > 0 ? (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Lote
            <select
              value={selectedLote ? String(selectedLote.id) : ''}
              onChange={(event) => setLoteId(Number(event.target.value))}
              className={selectClassName()}
            >
              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  #{lote.number} · {lote.status === 'OPEN' ? 'abierto' : 'cerrado'}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {selected ? (
        <p className="text-sm text-yellow-200/80">
          {selected.name} · {formatAverage(selected.averageScore)} ·{' '}
          {scoreCountLabel(selected.ratingCount)} ·{' '}
          {nominationCountLabel(selected.nominations.length)}
        </p>
      ) : null}

      {tab === 'peliculas' ? (
        <MovieList movies={visibleMovies} personName={selected?.name ?? null} />
      ) : null}
      {tab === 'personas' ? (
        <PeopleList people={selected ? [selected] : people} focused={selected !== null} />
      ) : null}
      {tab === 'lotes' ? (
        <LotePanel lote={selectedLote} highlightId={selected?.userId ?? ''} />
      ) : null}
    </div>
  );
}

function MovieList({
  movies,
  personName,
}: {
  movies: AdminRatingsView['movies'];
  personName: string | null;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
        Películas
      </h2>
      {movies.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {personName
            ? `${personName} no puntuó ninguna película.`
            : 'Sin películas aún.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {movies.map((movie) => (
            <li
              key={movie.id}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 72px' }}
            >
              <details className="group rounded-xl border border-white/10 bg-zinc-950/50">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-2 [&::-webkit-details-marker]:hidden">
                  <Poster posterUrl={movie.posterUrl} />
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
                          <p className="text-[11px] text-zinc-500">{vote.votedAt}</p>
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
          ))}
        </ul>
      )}
    </section>
  );
}

function PeopleList({
  people,
  focused,
}: {
  people: PersonRow[];
  focused: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
        Personas
      </h2>
      {people.length === 0 ? (
        <p className="text-sm text-zinc-500">Nadie puntuó todavía.</p>
      ) : (
        <ul className="space-y-2">
          {people.map((person) => (
            <li key={person.userId}>
              <details
                open={focused ? true : undefined}
                className="group rounded-xl border border-white/10 bg-zinc-950/50"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                    {person.name}
                  </span>
                  <span className="shrink-0 text-right text-xs text-zinc-400">
                    {formatAverage(person.averageScore)} ·{' '}
                    {scoreCountLabel(person.ratingCount)}
                    {person.nominations.length > 0
                      ? ` · ${nominationCountLabel(person.nominations.length)}`
                      : ''}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                </summary>
                <PersonDetail person={person} />
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PersonDetail({ person }: { person: PersonRow }) {
  return (
    <div className="space-y-4 border-t border-white/10 px-3 py-3">
      <div className="space-y-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Nominaciones
        </h3>
        {person.nominations.length === 0 ? (
          <p className="text-xs text-zinc-500">Sin nominaciones.</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {person.nominations.map((nomination) => (
              <li key={nomination.movieId} className="truncate text-sm text-zinc-200">
                {nomination.title}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Puntajes
        </h3>
        {person.ratings.length === 0 ? (
          <p className="text-xs text-zinc-500">Todavía no puntuó.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
            {person.ratings.map((rating) => (
              <li
                key={rating.movieId}
                className="flex items-center gap-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-zinc-200">{rating.title}</p>
                  <p className="text-[11px] text-zinc-500">{rating.votedAt}</p>
                </div>
                <span className="w-6 shrink-0 text-right font-black tabular-nums text-yellow-300">
                  {rating.score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LotePanel({
  lote,
  highlightId,
}: {
  lote: AdminLoteView | null;
  highlightId: string;
}) {
  if (!lote) {
    return <p className="text-sm text-zinc-500">Todavía no hay lotes.</p>;
  }

  const ratingCount = lote.movies.reduce((sum, movie) => sum + movie.ratingCount, 0);
  const voterIds = new Set<string>();
  let nominatedByPerson = 0;
  let scoredByPerson = 0;
  let skippedByPerson = 0;
  for (const movie of lote.movies) {
    for (const vote of movie.votes) voterIds.add(vote.userId);
    if (highlightId) {
      if (movie.nominators.some((person) => person.userId === highlightId)) {
        nominatedByPerson += 1;
      }
      if (movie.votes.some((vote) => vote.userId === highlightId)) {
        scoredByPerson += 1;
      }
      if (movie.skips.some((person) => person.userId === highlightId)) {
        skippedByPerson += 1;
      }
    }
  }
  const qualified = lote.movies.filter(
    (movie) => movie.ratingCount >= IMDB_LTA_MIN_RATINGS_TO_QUALIFY
  ).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
            Lote #{lote.number} · {lote.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {lote.status === 'OPEN'
              ? `Desde ${lote.openedAt}`
              : `Cerrado ${lote.closedAt ?? lote.openedAt}`}
          </p>
        </div>
        <p className="text-xs text-zinc-400">
          {lote.movies.length} películas · {ratingCount} puntajes · {voterIds.size}{' '}
          personas · {qualified} calificadas
        </p>
      </div>

      {highlightId ? (
        <p className="text-sm text-yellow-200/80">
          En este lote: {nominationCountLabel(nominatedByPerson)} ·{' '}
          {scoreCountLabel(scoredByPerson)} ·{' '}
          {skippedByPerson === 1 ? '1 no vista' : `${skippedByPerson} no vistas`}
        </p>
      ) : null}

      {lote.movies.length === 0 ? (
        <p className="text-sm text-zinc-500">Este lote no tiene películas.</p>
      ) : (
        <ul className="space-y-2">
          {lote.movies.map((movie) => {
            const missing = Math.max(
              0,
              IMDB_LTA_MIN_RATINGS_TO_QUALIFY - movie.ratingCount
            );
            return (
              <li
                key={movie.id}
                className="rounded-xl border border-white/10 bg-zinc-950/50 p-3"
              >
                <div className="flex items-center gap-3">
                  <Poster posterUrl={movie.posterUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-100">
                      {movie.position}. {movie.title}
                    </p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {movie.originalTitle} · {movie.imdbId}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black tabular-nums text-yellow-300">
                      {formatAverage(movie.averageScore)}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {scoreCountLabel(movie.ratingCount)}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] font-black uppercase tracking-widest',
                        missing === 0 ? 'text-emerald-400' : 'text-zinc-500'
                      )}
                    >
                      {missing === 0 ? 'Calificada' : `${missing} para calificar`}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-zinc-400">
                  <span className="font-black uppercase tracking-widest text-zinc-500">
                    Nominaron{' '}
                  </span>
                  <NameList
                    people={movie.nominators}
                    highlightId={highlightId}
                    empty="Nadie"
                  />
                </p>
                {movie.votes.length === 0 ? (
                  <p className="mt-2 text-[11px] text-zinc-500">Sin puntajes.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-white/5">
                    {movie.votes.map((vote) => (
                      <li
                        key={vote.userId}
                        className="flex items-center gap-3 py-1.5 text-sm"
                      >
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate',
                            vote.userId === highlightId
                              ? 'font-bold text-yellow-300'
                              : 'text-zinc-200'
                          )}
                        >
                          {vote.name}
                        </span>
                        <span className="text-[11px] text-zinc-500">{vote.votedAt}</span>
                        <span className="w-6 shrink-0 text-right font-black tabular-nums text-yellow-300">
                          {vote.score}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {movie.skips.length > 0 ? (
                  <p className="mt-2 text-[11px] text-zinc-400">
                    <span className="font-black uppercase tracking-widest text-zinc-500">
                      No la vi{' '}
                    </span>
                    <NameList
                      people={movie.skips}
                      highlightId={highlightId}
                      empty=""
                    />
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
