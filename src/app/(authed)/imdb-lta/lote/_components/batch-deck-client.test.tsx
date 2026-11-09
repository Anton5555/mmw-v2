// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BatchDeckMovie } from './batch-deck-client';

const mocks = vi.hoisted(() => ({
  submitRatingAction: vi.fn(),
  markNotSeenAction: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastMessage: vi.fn(),
}));

vi.mock('@/lib/actions/imdb-lta/submit-rating', () => ({
  submitRatingAction: mocks.submitRatingAction,
}));
vi.mock('@/lib/actions/imdb-lta/mark-not-seen', () => ({
  markNotSeenAction: mocks.markNotSeenAction,
}));
vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    message: mocks.toastMessage,
  },
}));
vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return { ...actual, useReducedMotion: () => true };
});

import { BatchDeckClient } from './batch-deck-client';

function movie(id: number, title: string): BatchDeckMovie {
  return {
    id,
    title,
    originalTitle: title,
    releaseDate: '2025-01-01T00:00:00.000Z',
    posterUrl: '',
    imdbId: `tt${id}`,
    userNominated: false,
  };
}

function renderDeck() {
  return render(
    <BatchDeckClient
      batch={{ id: 1, number: 1, openedAt: '2026-01-01' }}
      deck={[movie(1, 'First'), movie(2, 'Second')]}
      doneCount={8}
      skippedCount={0}
      ineligibleCount={0}
      totalInBatch={10}
      isRatingOpen
    />
  );
}

describe('BatchDeckClient', () => {
  beforeEach(() => {
    mocks.submitRatingAction.mockReset();
    mocks.markNotSeenAction.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.toastMessage.mockReset();
  });

  it('leaves the next card clickable while the previous score is still saving', async () => {
    const user = userEvent.setup();
    let resolveSave: (value: unknown) => void = () => {};
    mocks.submitRatingAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        })
    );

    renderDeck();
    await user.click(screen.getByRole('button', { name: '8' }));

    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled();
    expect(mocks.submitRatingAction).toHaveBeenCalledWith(1, 8);

    resolveSave({ id: 1, movieId: 1, score: 8 });
    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalled();
    });
    expect(screen.getByRole('heading', { name: 'Second' })).toBeInTheDocument();
  });

  it('puts a failed "no la vi" back and rolls the skipped count back', async () => {
    const user = userEvent.setup();
    mocks.markNotSeenAction.mockRejectedValue(new Error('No se pudo guardar'));

    renderDeck();
    await user.click(screen.getByRole('button', { name: 'No la vi' }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('No se pudo guardar');
    });
    expect(screen.getByRole('heading', { name: 'First' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '1 no vista' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No la vi' })).toBeEnabled();
  });
});
