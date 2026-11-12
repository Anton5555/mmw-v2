// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RateMovieClient } from './rating-page-client';

const mocks = vi.hoisted(() => ({
  setWantToWatchAction: vi.fn(),
  submitRatingAction: vi.fn(),
  refresh: vi.fn(),
  setParams: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock('@/lib/hooks/useImdbLtaRateParams', () => ({
  useImdbLtaRateParams: () => ({ setParams: mocks.setParams }),
}));
vi.mock('@/lib/actions/imdb-lta/set-want-to-watch', () => ({
  setWantToWatchAction: mocks.setWantToWatchAction,
}));
vi.mock('@/lib/actions/imdb-lta/submit-rating', () => ({
  submitRatingAction: mocks.submitRatingAction,
}));
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { RatingPageClient } from './rating-page-client';

function movie(overrides: Partial<RateMovieClient> = {}): RateMovieClient {
  return {
    id: 7,
    title: 'Heat',
    originalTitle: 'Heat',
    originalLanguage: 'en',
    releaseDate: '1995-12-15T00:00:00.000Z',
    posterUrl: '',
    imdbId: 'tt0113277',
    tmdbId: 7,
    nominationCount: 2,
    ratingCount: 0,
    averageScore: null,
    userNominated: false,
    userScore: null,
    batchState: 'released',
    userSkipped: true,
    userWantToWatch: false,
    ...overrides,
  };
}

function renderPage(
  movies: RateMovieClient[],
  filter: 'not_seen' | 'want_to_watch' | 'mine_done' = 'not_seen'
) {
  return render(
    <RatingPageClient
      movies={movies}
      pagination={{ page: 1, limit: 30, total: movies.length, totalPages: 1 }}
      isRatingOpen
      filter={filter}
    />
  );
}

describe('RatingPageClient Quiero ver', () => {
  beforeEach(() => {
    mocks.setWantToWatchAction.mockReset();
    mocks.setWantToWatchAction.mockResolvedValue({ movieId: 7, wantToWatch: true });
    mocks.refresh.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });

  it('pins a no-vista from the eye and unpins it again', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPage([movie()]);

    await user.click(screen.getByRole('button', { name: 'Marcar Quiero ver' }));
    expect(mocks.setWantToWatchAction).toHaveBeenCalledWith(7, true);

    rerender(
      <RatingPageClient
        movies={[movie({ userWantToWatch: true })]}
        pagination={{ page: 1, limit: 30, total: 1, totalPages: 1 }}
        isRatingOpen
        filter="not_seen"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Quitar de Quiero ver' }));
    expect(mocks.setWantToWatchAction).toHaveBeenLastCalledWith(7, false);
  });

  it('hides the eye once the movie has a score', () => {
    renderPage([movie({ userScore: 8, userSkipped: false, userWantToWatch: false })], 'mine_done');
    expect(screen.queryByRole('button', { name: 'Marcar Quiero ver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar de Quiero ver' })).not.toBeInTheDocument();
  });

  it('explains an empty Quiero ver list', () => {
    renderPage([], 'want_to_watch');
    expect(screen.getByText('Todavía no marcaste ninguna como quiero ver.')).toBeInTheDocument();
  });
});
