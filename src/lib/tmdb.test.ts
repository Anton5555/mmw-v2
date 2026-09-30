import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMovieById,
  getMovieDetails,
  getMovieDetailsFull,
  searchMovieByName,
} from './tmdb';

const fetchMock = vi.fn();

const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) => ({
  ok: init.ok ?? true,
  status: init.status ?? 200,
  statusText: 'x',
  json: async () => body,
});

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const requestedUrl = () => new URL(fetchMock.mock.calls[0][0] as string);

describe('getMovieById', () => {
  const found = {
    movie_results: [
      {
        id: 949,
        title: 'Heat',
        release_date: '1995-12-15',
        original_language: 'en',
        original_title: 'Heat',
        poster_path: '/heat.jpg',
      },
    ],
  };

  it('looks the movie up by IMDb id and maps the response', async () => {
    fetchMock.mockResolvedValue(jsonResponse(found));
    const movie = await getMovieById('tt0113277');

    const url = requestedUrl();
    expect(url.pathname).toBe('/3/find/tt0113277');
    expect(url.searchParams.get('external_source')).toBe('imdb_id');
    expect(url.searchParams.get('api_key')).toBe('test-tmdb-key');
    expect(movie).toEqual({
      id: 949,
      title: 'Heat',
      release_date: '1995-12-15',
      original_language: 'en',
      original_title: 'Heat',
      poster_path: 'https://image.tmdb.org/t/p/original/heat.jpg',
      imdbId: 'tt0113277',
    });
  });

  it('returns an empty poster url when TMDB has no poster', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ movie_results: [{ ...found.movie_results[0], poster_path: null }] })
    );
    await expect(getMovieById('tt0113277')).resolves.toMatchObject({ poster_path: '' });
  });

  it('returns null on a non-ok response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 401 }));
    await expect(getMovieById('tt0113277')).resolves.toBeNull();
  });

  it('returns null when TMDB finds nothing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ movie_results: [] }));
    await expect(getMovieById('tt0000000')).resolves.toBeNull();
  });

  it('returns null when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(getMovieById('tt0113277')).resolves.toBeNull();
  });
});

describe('searchMovieByName', () => {
  it('url-encodes the query and passes the optional year', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ id: 1 }] }));
    await searchMovieByName('Amélie & co', 2001);

    const url = requestedUrl();
    expect(url.pathname).toBe('/3/search/movie');
    expect(url.searchParams.get('query')).toBe('Amélie & co');
    expect(url.searchParams.get('year')).toBe('2001');
    expect(url.searchParams.get('language')).toBe('es-ES');
  });

  it('omits the year when not provided', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    await searchMovieByName('Heat');
    expect(requestedUrl().searchParams.has('year')).toBe(false);
  });

  it('returns an empty array when results are missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(searchMovieByName('Heat')).resolves.toEqual([]);
  });

  it('returns null on API and network errors', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }));
    await expect(searchMovieByName('Heat')).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('network'));
    await expect(searchMovieByName('Heat')).resolves.toBeNull();
  });
});

describe('getMovieDetails', () => {
  it('returns the first director and first genre', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 949,
        genres: [{ id: 1, name: 'Crime' }, { id: 2, name: 'Drama' }],
        credits: {
          crew: [
            { job: 'Producer', name: 'Someone' },
            { job: 'Director', name: 'Michael Mann' },
            { job: 'Director', name: 'Second Unit' },
          ],
        },
      })
    );
    await expect(getMovieDetails(949)).resolves.toEqual({
      director: 'Michael Mann',
      genre: 'Crime',
    });
    expect(requestedUrl().pathname).toBe('/3/movie/949');
    expect(requestedUrl().searchParams.get('append_to_response')).toBe('credits');
  });

  it('leaves fields undefined when credits and genres are missing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));
    await expect(getMovieDetails(1)).resolves.toEqual({ director: undefined, genre: undefined });
  });

  it('returns null on error responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 404 }));
    await expect(getMovieDetails(1)).resolves.toBeNull();
  });
});

describe('getMovieDetailsFull', () => {
  it('returns all genres, directors and countries', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        id: 949,
        genres: [{ id: 1, name: 'Crime' }],
        production_countries: [{ iso_3166_1: 'US', name: 'United States of America' }],
        credits: {
          crew: [
            { job: 'Director', name: 'A', id: 10 },
            { job: 'Editor', name: 'B', id: 11 },
            { job: 'Director', name: 'C', id: 12 },
          ],
        },
      })
    );
    await expect(getMovieDetailsFull(949)).resolves.toEqual({
      tmdbId: 949,
      genres: [{ id: 1, name: 'Crime' }],
      directors: [
        { id: 10, name: 'A' },
        { id: 12, name: 'C' },
      ],
      countries: [{ code: 'US', name: 'United States of America' }],
    });
  });

  it('defaults to empty lists', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 5 }));
    await expect(getMovieDetailsFull(5)).resolves.toEqual({
      tmdbId: 5,
      genres: [],
      directors: [],
      countries: [],
    });
  });

  it('returns null when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(getMovieDetailsFull(5)).resolves.toBeNull();
  });
});
