// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AdminRatingsView } from './imdb-lta-admin-ratings';

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

describe('ImdbLtaAdminRatings', () => {
  it('shows averages and each vote, collapsed until opened', () => {
    render(<ImdbLtaAdminRatings snapshot={snapshot} />);

    expect(
      screen.getByText('2 películas · 1 puntajes · 1 personas')
    ).toBeTruthy();
    expect(screen.getAllByText('9.0').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin puntaje')).toBeTruthy();
    expect(screen.getByText('Sin puntajes.')).toBeTruthy();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);

    const movie = screen.getAllByText('Best')[0]?.closest('details');
    expect(movie?.hasAttribute('open')).toBe(false);
  });

  it('says when nobody has scored', () => {
    render(
      <ImdbLtaAdminRatings
        snapshot={{
          movieCount: 0,
          totalRatings: 0,
          voterCount: 0,
          movies: [],
          people: [],
        }}
      />
    );

    expect(screen.getByText('Nadie puntuó todavía.')).toBeTruthy();
    expect(screen.getByText('Sin películas aún.')).toBeTruthy();
  });
});
