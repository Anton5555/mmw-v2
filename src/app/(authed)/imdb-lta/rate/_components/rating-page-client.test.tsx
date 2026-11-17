// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImdbLtaRatingFilter } from '@/lib/validations/imdb-lta';
import type { RateMovieClient } from './rating-page-client';

const mocks = vi.hoisted(() => ({
  setWantToWatchAction: vi.fn(),
  markNotSeenAction: vi.fn(),
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
vi.mock('@/lib/actions/imdb-lta/mark-not-seen', () => ({
  markNotSeenAction: mocks.markNotSeenAction,
}));
vi.mock('@/lib/actions/imdb-lta/submit-rating', () => ({
  submitRatingAction: mocks.submitRatingAction,
}));
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import { RatingPageClient } from './rating-page-client';

const EMPTY_COUNTS: Record<ImdbLtaRatingFilter, number> = {
  pending: 0,
  mine_done: 0,
  not_seen: 0,
  want_to_watch: 0,
};

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
  filter: ImdbLtaRatingFilter = 'not_seen',
  overrides: {
    counts?: Partial<Record<ImdbLtaRatingFilter, number>>;
    onlyShort?: boolean;
  } = {}
) {
  const counts = {
    ...EMPTY_COUNTS,
    [filter]: movies.length,
    ...overrides.counts,
  };
  return render(
    <RatingPageClient
      movies={movies}
      pagination={{ page: 1, limit: 30, total: movies.length, totalPages: 1 }}
      counts={counts}
      isRatingOpen
      filter={filter}
      onlyShort={overrides.onlyShort ?? false}
    />
  );
}

describe('RatingPageClient tabs', () => {
  beforeEach(() => {
    mocks.setParams.mockReset();
  });

  it('renders the four exclusive tabs with counts', () => {
    renderPage([], 'pending', {
      counts: {
        pending: 12,
        mine_done: 4,
        not_seen: 3,
        want_to_watch: 1,
      },
    });

    expect(screen.getByRole('tab', { name: /Por votar/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: /Por votar/i })).toHaveTextContent(
      '12'
    );
    expect(screen.getByRole('tab', { name: /Ya puntuadas/i })).toHaveTextContent(
      '4'
    );
    expect(screen.getByRole('tab', { name: /No vistas/i })).toHaveTextContent(
      '3'
    );
    expect(screen.getByRole('tab', { name: /Quiero ver/i })).toHaveTextContent(
      '1'
    );
  });

  it('shows the ranking explanation and short toggle only on Por votar', async () => {
    const user = userEvent.setup();
    renderPage([], 'pending');

    expect(
      screen.getByText(/entra al ranking cuando tiene al menos/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /Solo las que no llegan al ranking/i,
      })
    );
    expect(mocks.setParams).toHaveBeenCalledWith({
      filter: 'pending',
      short: true,
      page: 1,
    });
  });

  it('hides the ranking toggle outside Por votar', () => {
    renderPage([], 'mine_done', { counts: { mine_done: 0 } });
    expect(
      screen.queryByRole('button', {
        name: /Solo las que no llegan al ranking/i,
      })
    ).not.toBeInTheDocument();
  });
});

describe('RatingPageClient No vistas from Por votar', () => {
  beforeEach(() => {
    mocks.markNotSeenAction.mockReset();
    mocks.markNotSeenAction.mockResolvedValue({ movieId: 7, skipped: true });
    mocks.refresh.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });

  it('sends a pending movie to No vistas', async () => {
    const user = userEvent.setup();
    renderPage(
      [movie({ userSkipped: false, userScore: null, batchState: 'released' })],
      'pending'
    );

    await user.click(screen.getByRole('button', { name: 'Mandar a No vistas' }));
    expect(mocks.markNotSeenAction).toHaveBeenCalledWith(7);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Pasó a No vistas');
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('keeps the button off the other tabs', () => {
    renderPage([movie()], 'not_seen');
    expect(
      screen.queryByRole('button', { name: 'Mandar a No vistas' })
    ).not.toBeInTheDocument();
  });

  it('reports when the move fails', async () => {
    const user = userEvent.setup();
    mocks.markNotSeenAction.mockRejectedValue(new Error('Cerrada'));
    renderPage(
      [movie({ userSkipped: false, userScore: null })],
      'pending'
    );

    await user.click(screen.getByRole('button', { name: 'Mandar a No vistas' }));
    expect(mocks.toastError).toHaveBeenCalledWith('Cerrada');
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});

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
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Pasó a Quiero ver');

    rerender(
      <RatingPageClient
        movies={[movie({ userWantToWatch: true })]}
        pagination={{ page: 1, limit: 30, total: 1, totalPages: 1 }}
        counts={{ ...EMPTY_COUNTS, want_to_watch: 1 }}
        isRatingOpen
        filter="want_to_watch"
        onlyShort={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Quitar de Quiero ver' }));
    expect(mocks.setWantToWatchAction).toHaveBeenLastCalledWith(7, false);
    expect(mocks.toastSuccess).toHaveBeenLastCalledWith('Volvió a No vistas');
  });

  it('hides the eye once the movie has a score', () => {
    renderPage(
      [movie({ userScore: 8, userSkipped: false, userWantToWatch: false })],
      'mine_done'
    );
    expect(screen.queryByRole('button', { name: 'Marcar Quiero ver' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar de Quiero ver' })).not.toBeInTheDocument();
  });

  it('explains an empty Quiero ver list', () => {
    renderPage([], 'want_to_watch');
    expect(screen.getByText('Todavía no marcaste ninguna como quiero ver.')).toBeInTheDocument();
  });
});
