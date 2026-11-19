import Image from 'next/image';
import type { MyNominationSummary } from '@/lib/api/imdb-lta';

type RevisarMyNominationsProps = {
  nominations: Array<
    Omit<MyNominationSummary, 'releaseDate'> & { releaseDate: string }
  >;
};

function posterSrc(posterUrl: string) {
  if (!posterUrl) return '';
  return posterUrl.startsWith('http')
    ? posterUrl
    : `https://image.tmdb.org/t/p/w500${posterUrl}`;
}

function yearOf(iso: string) {
  const year = new Date(iso).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function badgeFor(batchState: MyNominationSummary['batchState']) {
  switch (batchState) {
    case 'released':
      return {
        label: 'Ya salió',
        className: 'bg-emerald-500/15 text-emerald-300',
      };
    case 'open':
      return {
        label: 'Lote actual',
        className: 'bg-yellow-500/15 text-yellow-300',
      };
    default:
      return {
        label: 'Todavía no',
        className: 'bg-zinc-500/20 text-zinc-400',
      };
  }
}

export function RevisarMyNominations({
  nominations,
}: RevisarMyNominationsProps) {
  if (nominations.length === 0) {
    return null;
  }

  return (
    <details className="group rounded-3xl border border-white/10 bg-zinc-950/60 open:pb-5">
      <summary className="cursor-pointer list-none px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-yellow-400">
              Tus nominaciones
            </p>
            <p className="mt-0.5 text-sm text-zinc-400">
              {nominations.length} películas que nominaste · solo lectura
            </p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 group-open:hidden">
            Ver
          </span>
          <span className="hidden text-xs font-bold uppercase tracking-wider text-zinc-500 group-open:inline">
            Ocultar
          </span>
        </div>
      </summary>

      <ul className="grid grid-cols-3 gap-3 px-5 sm:grid-cols-4 sm:px-6 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {nominations.map((movie) => {
          const src = posterSrc(movie.posterUrl);
          const year = yearOf(movie.releaseDate);
          const badge = badgeFor(movie.batchState);
          return (
            <li key={movie.id} className="space-y-1.5">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                {src ? (
                  <Image
                    src={src}
                    alt={movie.title}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-zinc-500">
                    Sin póster
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-[11px] font-bold leading-snug text-zinc-200">
                {movie.title}
                {year ? (
                  <span className="font-mono font-normal text-zinc-500">
                    {' '}
                    ({year})
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-1">
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.className}`}
                >
                  {badge.label}
                </span>
                {movie.userScore !== null ? (
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-zinc-300">
                    {movie.userScore}/10
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
