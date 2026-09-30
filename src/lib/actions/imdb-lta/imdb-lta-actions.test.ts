import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  api: {
    addNomination: vi.fn(),
    removeNomination: vi.fn(),
    submitNominations: vi.fn(),
    lookupMovie: vi.fn(),
    updateImdbLtaPhase: vi.fn(),
  },
  movies: {
    findMovieByImdbId: vi.fn(),
    searchInternalMoviesByName: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/api/imdb-lta', () => mocks.api);
vi.mock('@/lib/api/movies', () => mocks.movies);

import { addNominationAction } from './add-nomination';
import { lookupMovieAction } from './lookup-movie';
import { removeNominationAction } from './remove-nomination';
import { searchNominationsAction } from './search-nominations';
import { submitNominationsAction } from './submit-nominations';
import { updateImdbLtaPhaseAction } from './update-phase';

const USER = { user: { id: 'u1', role: 'user' } };
const ADMIN = { user: { id: 'admin1', role: 'admin' } };

beforeEach(() => {
  mocks.getSession.mockResolvedValue(USER);
});

describe.each([
  ['addNominationAction', () => addNominationAction(1)],
  ['removeNominationAction', () => removeNominationAction(1)],
  ['submitNominationsAction', () => submitNominationsAction()],
  ['lookupMovieAction', () => lookupMovieAction('Heat')],
  ['searchNominationsAction', () => searchNominationsAction('Heat')],
  ['updateImdbLtaPhaseAction', () => updateImdbLtaPhaseAction('RATING_OPEN')],
] as const)('%s', (_name, run) => {
  it('rejects unauthenticated callers before doing any work', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(run()).rejects.toThrow('No autorizado');
    Object.values({ ...mocks.api, ...mocks.movies }).forEach((fn) => {
      expect(fn).not.toHaveBeenCalled();
    });
  });
});

describe('addNominationAction / removeNominationAction', () => {
  it('adds for the session user and revalidates', async () => {
    mocks.api.addNomination.mockResolvedValue({ count: 3 });
    await expect(addNominationAction(7)).resolves.toEqual({ count: 3 });
    expect(mocks.api.addNomination).toHaveBeenCalledWith('u1', 7);
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta');
  });

  it('removes for the session user and revalidates', async () => {
    mocks.api.removeNomination.mockResolvedValue({ count: 2, submittedAt: null });
    await removeNominationAction(7);
    expect(mocks.api.removeNomination).toHaveBeenCalledWith('u1', 7);
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta');
  });

  it.each([0, -3, 1.5])('validates the movie id (%d)', async (movieId) => {
    await expect(addNominationAction(movieId)).rejects.toThrow();
    await expect(removeNominationAction(movieId)).rejects.toThrow();
    expect(mocks.api.addNomination).not.toHaveBeenCalled();
    expect(mocks.api.removeNomination).not.toHaveBeenCalled();
  });

  it('does not revalidate when the API rejects', async () => {
    mocks.api.addNomination.mockRejectedValue(new Error('Esta película ya está en tu lista'));
    await expect(addNominationAction(7)).rejects.toThrow('ya está en tu lista');
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('submitNominationsAction', () => {
  it('submits for the session user and revalidates', async () => {
    mocks.api.submitNominations.mockResolvedValue({ count: 25, submittedAt: new Date() });
    await submitNominationsAction();
    expect(mocks.api.submitNominations).toHaveBeenCalledWith('u1');
    expect(revalidatePath).toHaveBeenCalledWith('/imdb-lta');
  });
});

describe('lookupMovieAction', () => {
  it('passes the trimmed query to the lookup', async () => {
    mocks.api.lookupMovie.mockResolvedValue({ status: 'not_found' });
    await lookupMovieAction('  Heat  ');
    expect(mocks.api.lookupMovie).toHaveBeenCalledWith('Heat');
  });

  it('rejects blank queries', async () => {
    await expect(lookupMovieAction('   ')).rejects.toThrow();
    expect(mocks.api.lookupMovie).not.toHaveBeenCalled();
  });
});

describe('searchNominationsAction (DB-only typeahead)', () => {
  it('rejects queries shorter than 2 characters', async () => {
    await expect(searchNominationsAction('a')).rejects.toThrow();
  });

  it('resolves an IMDb id to at most one movie', async () => {
    mocks.movies.findMovieByImdbId.mockResolvedValue({ id: 1, title: 'Heat' });
    await expect(searchNominationsAction('tt0113277')).resolves.toEqual([{ id: 1, title: 'Heat' }]);
    expect(mocks.movies.searchInternalMoviesByName).not.toHaveBeenCalled();
  });

  it('returns an empty list for an unknown IMDb id', async () => {
    mocks.movies.findMovieByImdbId.mockResolvedValue(null);
    await expect(searchNominationsAction('tt0000001')).resolves.toEqual([]);
  });

  it('searches by name limited to 8 suggestions', async () => {
    mocks.movies.searchInternalMoviesByName.mockResolvedValue([{ id: 2 }]);
    await expect(searchNominationsAction('Heat')).resolves.toEqual([{ id: 2 }]);
    expect(mocks.movies.searchInternalMoviesByName).toHaveBeenCalledWith('Heat', 8);
  });
});

describe('updateImdbLtaPhaseAction (admin only)', () => {
  it('rejects non-admin users', async () => {
    mocks.getSession.mockResolvedValue(USER);
    await expect(updateImdbLtaPhaseAction('RATING_OPEN')).rejects.toThrow('No autorizado');
    expect(mocks.api.updateImdbLtaPhase).not.toHaveBeenCalled();
  });

  it('rejects unknown phases even for admins', async () => {
    mocks.getSession.mockResolvedValue(ADMIN);
    await expect(updateImdbLtaPhaseAction('SOMETHING_ELSE' as never)).rejects.toThrow();
    expect(mocks.api.updateImdbLtaPhase).not.toHaveBeenCalled();
  });

  it('updates the phase and revalidates every IMDB LTA page', async () => {
    mocks.getSession.mockResolvedValue(ADMIN);
    mocks.api.updateImdbLtaPhase.mockResolvedValue({ id: 1, phase: 'RATING_OPEN' });

    await expect(updateImdbLtaPhaseAction('RATING_OPEN')).resolves.toEqual({
      id: 1,
      phase: 'RATING_OPEN',
    });

    expect(mocks.api.updateImdbLtaPhase).toHaveBeenCalledWith('RATING_OPEN');
    for (const path of ['/imdb-lta', '/imdb-lta/rate', '/imdb-lta/ranking']) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
  });
});
