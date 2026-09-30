'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { parseAsInteger, useQueryState } from 'nuqs';
import {
  getMovieSheetDataAction,
  type MovieSheetData,
  type MovieSheetKind,
} from '@/lib/actions/movies/get-movie-sheet-data';
import { MovieDetail } from './movie-detail';
import { MovieSheet } from './movie-sheet';

const MOVIE_HREF = /^\/(?:lists|mam|year-tops)\/movie\/(\d+)\/?$/;

/** True when the current `?movie=` entry was pushed by us (so close = back). */
let openedInApp = false;

const movieParam = parseAsInteger.withOptions({ history: 'push' });

export function useOpenMovieSheet() {
  const [, setMovieId] = useQueryState('movie', movieParam);
  return (id: number) => {
    openedInApp = true;
    void setMovieId(id);
  };
}

function getContext(pathname: string): {
  kind: MovieSheetKind;
  listId?: string;
} {
  const list = pathname.match(/^\/lists\/(\d+)/);
  if (list) return { kind: 'list', listId: list[1] };
  if (pathname.startsWith('/year-tops')) return { kind: 'year-top' };
  return { kind: 'mam' };
}

function fullPageHref(id: number, kind: MovieSheetKind, listId?: string) {
  if (kind === 'list') {
    return `/lists/movie/${id}${listId ? `?listId=${listId}` : ''}`;
  }
  return `${kind === 'year-top' ? '/year-tops' : '/mam'}/movie/${id}`;
}

function SheetSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="flex gap-4 px-4 pb-6 pt-6">
        <div className="aspect-[2/3] w-[110px] shrink-0 rounded-2xl bg-white/5" />
        <div className="flex-1 space-y-3 pt-8">
          <div className="h-7 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
          <div className="h-7 w-32 rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-4 px-4 py-6">
        <div className="h-20 rounded-xl bg-white/5" />
        <div className="h-32 rounded-xl bg-white/5" />
        <div className="h-32 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

/**
 * Sheet driven by `?movie=<id>`. The param is updated shallowly (no server
 * render of the page underneath) and the details are fetched on demand.
 */
export function MovieSheetHost() {
  const [movieId, setMovieId] = useQueryState('movie', movieParam);
  const pathname = usePathname();
  const { kind, listId } = getContext(pathname);
  const key = movieId == null ? null : `${kind}:${listId ?? ''}:${movieId}`;

  const [loaded, setLoaded] = useState<{
    key: string;
    id: number;
    kind: MovieSheetKind;
    listId?: string;
    data: MovieSheetData | null;
  } | null>(null);

  // Open the sheet instead of navigating when a movie link is clicked.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const anchor = (e.target as Element | null)?.closest?.('a');
      if (!anchor || (anchor.target && anchor.target !== '_self')) return;
      if (anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const match = url.pathname.match(MOVIE_HREF);
      if (!match) return;

      e.preventDefault();
      e.stopPropagation();
      openedInApp = true;
      void setMovieId(parseInt(match[1]));
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [setMovieId]);

  useEffect(() => {
    if (movieId == null) {
      openedInApp = false;
      return;
    }
    let cancelled = false;
    getMovieSheetDataAction(movieId, kind, listId)
      .then((data) => {
        if (!cancelled) {
          setLoaded({ key: key!, id: movieId, kind, listId, data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded({ key: key!, id: movieId, kind, listId, data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [movieId, kind, listId, key]);

  const close = () => {
    if (openedInApp) {
      openedInApp = false;
      window.history.back();
    } else {
      void setMovieId(null, { history: 'replace' });
    }
  };

  // Keep the last loaded movie around so the sheet can animate out.
  const current = loaded?.key === key ? loaded : null;
  const shown = current ?? loaded;
  if (movieId == null && !loaded) return null;

  const data = current?.data ?? null;
  const title = data
    ? data.movie.originalLanguage === 'es'
      ? data.movie.originalTitle
      : data.movie.title
    : 'Película';

  return (
    <MovieSheet
      open={movieId != null}
      onClose={close}
      title={title}
      fullPageHref={fullPageHref(
        movieId ?? shown?.id ?? 0,
        shown?.kind ?? kind,
        shown?.listId ?? listId
      )}
    >
      {!shown || (movieId != null && !current) ? (
        <SheetSkeleton />
      ) : shown.data ? (
        <MovieDetail
          compact
          movie={shown.data.movie}
          rank={shown.data.rank}
          director={shown.data.director}
          genre={shown.data.genre}
          otherLists={shown.data.otherLists}
          yearTopSummary={shown.data.yearTopSummary}
        />
      ) : (
        <p className="px-4 py-12 text-center text-sm text-zinc-400">
          No se pudo cargar la película.
        </p>
      )}
    </MovieSheet>
  );
}
