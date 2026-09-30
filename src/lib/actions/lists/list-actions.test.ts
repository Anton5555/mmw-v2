import { revalidatePath } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  createList: vi.fn(),
  getListMovies: vi.fn(),
  getMovieById: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('@/lib/api/lists', () => ({
  createList: mocks.createList,
  getListMovies: mocks.getListMovies,
}));
vi.mock('@/lib/tmdb', () => ({ getMovieById: mocks.getMovieById }));

import { createListAction } from './create-list';
import { loadMoreMoviesAction } from './load-more-movies';
import { previewMoviesAction } from './preview-list';

const listInput = { name: 'Best of 2025' } as never;

describe('createListAction (admin only)', () => {
  it('requires a session', async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(createListAction(listInput)).rejects.toThrow('No autorizado');
    expect(mocks.createList).not.toHaveBeenCalled();
  });

  it('rejects non-admin users', async () => {
    mocks.getSession.mockResolvedValue({ user: { role: 'user' } });
    await expect(createListAction(listInput)).rejects.toThrow('No autorizado');
    expect(mocks.createList).not.toHaveBeenCalled();
  });

  it('creates the list for admins and revalidates /lists', async () => {
    mocks.getSession.mockResolvedValue({ user: { role: 'admin' } });
    await expect(createListAction(listInput)).resolves.toEqual({ success: true });
    expect(mocks.createList).toHaveBeenCalledWith({ data: listInput });
    expect(revalidatePath).toHaveBeenCalledWith('/lists');
  });
});

describe('loadMoreMoviesAction', () => {
  it('delegates to getListMovies with the same input', async () => {
    const params = { listId: 1, page: 2 } as never;
    mocks.getListMovies.mockResolvedValue({ movies: [] });
    await expect(loadMoreMoviesAction(params)).resolves.toEqual({ movies: [] });
    expect(mocks.getListMovies).toHaveBeenCalledWith(params);
  });
});

describe('previewMoviesAction', () => {
  beforeEach(() => {
    mocks.getMovieById.mockReset();
  });

  it('requires at least one IMDb id', async () => {
    await expect(previewMoviesAction([])).rejects.toThrow('No se proporcionaron IDs de IMDB');
    expect(mocks.getMovieById).not.toHaveBeenCalled();
  });

  it('maps TMDB data to previews, keeping the input order', async () => {
    mocks.getMovieById.mockImplementation(async (imdbId: string) => ({
      title: `Title ${imdbId}`,
      original_title: `Original ${imdbId}`,
      poster_path: `https://img/${imdbId}.jpg`,
      imdbId,
    }));

    await expect(previewMoviesAction(['tt1', 'tt2'])).resolves.toEqual([
      { title: 'Title tt1', originalTitle: 'Original tt1', posterUrl: 'https://img/tt1.jpg', imdbId: 'tt1' },
      { title: 'Title tt2', originalTitle: 'Original tt2', posterUrl: 'https://img/tt2.jpg', imdbId: 'tt2' },
    ]);
  });

  it('falls back to an empty poster url', async () => {
    mocks.getMovieById.mockResolvedValue({
      title: 'A',
      original_title: 'A',
      poster_path: '',
      imdbId: 'tt1',
    });
    const [preview] = await previewMoviesAction(['tt1']);
    expect(preview.posterUrl).toBe('');
  });

  it('fails the whole preview naming the first movie TMDB could not resolve', async () => {
    mocks.getMovieById.mockResolvedValue(null);
    await expect(previewMoviesAction(['tt9'])).rejects.toThrow(
      'No se pudo obtener la información de la película tt9'
    );
  });
});
