// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdminLoteView, AdminRatingsView } from './imdb-lta-admin-ratings';

vi.mock('next/image', () => ({
  default: () => null,
}));

import { ImdbLtaAdminRatings } from './imdb-lta-admin-ratings';

const snapshot: AdminRatingsView = {
  movieCount: 2,
  totalRatings: 1,
  voterCount: 1,
  movies: [
    {
      id: 1,
      title: 'Best',
      originalTitle: 'Best',
      posterUrl: '/p.jpg',
      imdbId: 'tt0000001',
      ratingCount: 1,
      averageScore: 9,
      votes: [
        {
          userId: 'ana',
          name: 'Ana',
          score: 9,
          votedAt: '2 nov 2026, 12:00',
        },
      ],
    },
    {
      id: 2,
      title: 'Quiet',
      originalTitle: 'Quiet',
      posterUrl: '',
      imdbId: 'tt0000002',
      ratingCount: 0,
      averageScore: null,
      votes: [],
    },
  ],
  people: [
    {
      userId: 'ana',
      name: 'Ana',
      ratingCount: 1,
      averageScore: 9,
      ratings: [
        {
          movieId: 1,
          title: 'Best',
          score: 9,
          votedAt: '2 nov 2026, 12:00',
        },
      ],
    },
  ],
};

const lote: AdminLoteView = {
  id: 7,
  number: 3,
  status: 'OPEN',
  openedAt: '10 nov 2026, 21:00',
  closedAt: null,
  movies: [
    {
      id: 1,
      title: 'Best',
      originalTitle: 'Best',
      posterUrl: '/p.jpg',
      imdbId: 'tt0000001',
      position: 1,
      ratingCount: 1,
      averageScore: 9,
      nominators: [
        { userId: 'ana', name: 'Ana' },
        { userId: 'bea', name: 'Bea' },
      ],
      votes: [
        {
          userId: 'ana',
          name: 'Ana',
          score: 9,
          votedAt: '2 nov 2026, 12:00',
        },
      ],
      skips: [{ userId: 'ciro', name: 'Ciro' }],
    },
  ],
};

function renderAdmin(
  overrides: Partial<{
    snapshot: AdminRatingsView;
    lotes: AdminLoteView[];
    picks: { userId: string; name: string; nominations: { movieId: number; title: string }[] }[];
  }> = {}
) {
  return render(
    <ImdbLtaAdminRatings
      snapshot={overrides.snapshot ?? snapshot}
      lotes={overrides.lotes ?? []}
      picks={overrides.picks ?? []}
    />
  );
}

describe('ImdbLtaAdminRatings', () => {
  it('shows averages and each vote, collapsed until opened', () => {
    renderAdmin();

    expect(screen.getByText('Puntajes').parentElement?.textContent).toContain('1');
    expect(screen.getByText('Calificadas').parentElement?.textContent).toContain('0');
    expect(screen.getByText('Sin lote')).toBeTruthy();
    expect(screen.getAllByText('9.0').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin puntaje')).toBeTruthy();
    expect(screen.getByText('Sin puntajes.')).toBeTruthy();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
    expect(screen.queryByText('Nadie puntuó todavía.')).toBeNull();

    const movie = screen.getAllByText('Best')[0]?.closest('details');
    expect(movie?.hasAttribute('open')).toBe(false);
  });

  it('keeps personas on their own tab', () => {
    renderAdmin();

    expect(screen.queryByText('Nadie puntuó todavía.')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Personas' }));
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin nominaciones.')).toBeTruthy();
    expect(screen.queryByText('Quiet')).toBeNull();
  });

  it('filters a person’s scores and nominations', () => {
    renderAdmin({
      picks: [
        {
          userId: 'ana',
          name: 'Ana',
          nominations: [{ movieId: 2, title: 'Quiet' }],
        },
      ],
    });

    fireEvent.change(screen.getByLabelText('Persona'), { target: { value: 'ana' } });

    expect(screen.getByText('Ana · 9.0 · 1 puntaje · 1 nominación')).toBeTruthy();
    expect(screen.queryByText('Quiet')).toBeNull();
    expect(screen.getByText('Best')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Personas' }));
    expect(screen.getByText('Quiet')).toBeTruthy();
    expect(screen.getByText('Nominaciones')).toBeTruthy();
    expect(screen.getAllByText('Best').length).toBeGreaterThan(0);
  });

  it('shows who nominated and scored the open lote', () => {
    renderAdmin({ lotes: [lote] });

    expect(screen.getByText('#3').parentElement?.textContent).toContain('1/1 con puntaje');
    fireEvent.click(screen.getByRole('tab', { name: 'Lotes' }));

    expect(screen.getByText('Lote #3 · Abierto')).toBeTruthy();
    expect(screen.getByText('Desde 10 nov 2026, 21:00')).toBeTruthy();
    expect(screen.getByText('Bea')).toBeTruthy();
    expect(screen.getByText('No la vi')).toBeTruthy();
    expect(screen.getByText('Ciro')).toBeTruthy();
  });

  it('shows nominators on the collapsed película card and the imdb id inside', () => {
    renderAdmin({
      picks: [
        {
          userId: 'bea',
          name: 'Bea',
          nominations: [{ movieId: 1, title: 'Best' }],
        },
        {
          userId: 'ana',
          name: 'Ana',
          nominations: [
            { movieId: 1, title: 'Best' },
            { movieId: 2, title: 'Quiet' },
          ],
        },
      ],
    });

    const movie = screen.getAllByText('Best')[0]?.closest('details');
    const summary = movie?.querySelector('summary');
    expect(summary?.textContent).toContain('Nominaron');
    expect(summary?.textContent).toContain('Ana');
    expect(summary?.textContent).toContain('Bea');
    expect(summary?.textContent).not.toContain('tt0000001');
    expect(movie?.textContent).toContain('tt0000001');
    expect(movie?.hasAttribute('open')).toBe(false);

    const quiet = screen.getByText('Quiet').closest('details')?.querySelector('summary');
    expect(quiet?.textContent).toContain('Ana');
    expect(quiet?.textContent).not.toContain('Bea');
  });

  it('filters movies by name across tabs', () => {
    renderAdmin({
      snapshot: {
        ...snapshot,
        movies: [
          snapshot.movies[0]!,
          {
            ...snapshot.movies[1]!,
            title: 'Silencio',
            originalTitle: 'The Quiet One',
          },
        ],
      },
      lotes: [lote],
      picks: [
        {
          userId: 'ana',
          name: 'Ana',
          nominations: [{ movieId: 2, title: 'Silencio' }],
        },
      ],
    });

    fireEvent.change(screen.getByLabelText('Película'), {
      target: { value: 'quiet' },
    });

    expect(screen.queryByText('Best')).toBeNull();
    expect(screen.getByText('Silencio')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Película'), {
      target: { value: 'zzz' },
    });
    expect(screen.getByText('Ninguna película coincide.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Película'), {
      target: { value: 'best' },
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Lotes' }));
    expect(screen.getByText(/1\. Best/)).toBeTruthy();
    expect(screen.queryByText('Ninguna película de este lote coincide.')).toBeNull();

    fireEvent.change(screen.getByLabelText('Película'), {
      target: { value: 'silencio' },
    });
    expect(screen.getByText('Ninguna película de este lote coincide.')).toBeTruthy();

    fireEvent.click(screen.getByRole('tab', { name: 'Personas' }));
    expect(screen.getByText('Silencio')).toBeTruthy();
    expect(screen.getByText('Ninguna coincide.')).toBeTruthy();
  });

  it('says when nobody has scored', () => {
    renderAdmin({
      snapshot: {
        movieCount: 0,
        totalRatings: 0,
        voterCount: 0,
        movies: [],
        people: [],
      },
    });

    expect(screen.getByText('Sin películas aún.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Personas' }));
    expect(screen.getByText('Nadie puntuó todavía.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Lotes' }));
    expect(screen.getByText('Todavía no hay lotes.')).toBeTruthy();
  });
});
