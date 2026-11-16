import { describe, expect, it } from 'vitest';
import { formatOpenBatchCaption, pickNextBatchMovieIds } from './imdb-lta-batches';

type Row = Parameters<typeof pickNextBatchMovieIds>[0][number];

const row = (partial: Partial<Row> & { movieId: number }): Row => ({
  title: `Movie ${partial.movieId}`,
  nominationCount: 1,
  ratingCount: 0,
  appearanceCount: 0,
  skipCount: 0,
  ...partial,
});

/** Leaves Fisher–Yates order unchanged for small arrays. */
const identityRandom = () => 0.999999;

describe('pickNextBatchMovieIds', () => {
  it('picks never-batched movies at random, ignoring nomination count', () => {
    const candidates = [
      row({ movieId: 1, title: 'Low', nominationCount: 1 }),
      row({ movieId: 2, title: 'High', nominationCount: 5 }),
      row({ movieId: 3, title: 'Mid', nominationCount: 3 }),
      row({ movieId: 4, title: 'Most', nominationCount: 99 }),
    ];

    const stable = pickNextBatchMovieIds(candidates, {
      activeRaterCount: 10,
      size: 2,
      random: identityRandom,
    });
    expect(stable).toEqual([1, 2]);

    const swapped = pickNextBatchMovieIds(candidates, {
      activeRaterCount: 10,
      size: 2,
      random: () => 0,
    });
    expect(swapped).toEqual([3, 2]);
  });

  it('takes a random set of under-qualified movies up to the requeue cap', () => {
    const candidates = [
      row({
        movieId: 10,
        title: 'RequeueA',
        appearanceCount: 1,
        ratingCount: 1,
      }),
      row({
        movieId: 11,
        title: 'RequeueB',
        appearanceCount: 1,
        ratingCount: 2,
      }),
      row({
        movieId: 12,
        title: 'RequeueC',
        appearanceCount: 1,
        ratingCount: 0,
      }),
      row({
        movieId: 13,
        title: 'RequeueD',
        appearanceCount: 1,
        ratingCount: 3,
      }),
      row({ movieId: 20, title: 'Fresh', nominationCount: 9 }),
    ];

    const stable = pickNextBatchMovieIds(candidates, {
      activeRaterCount: 10,
      size: 10,
      requeueCap: 3,
      random: identityRandom,
    });
    expect(stable).toEqual([10, 11, 12, 20]);

    const swapped = pickNextBatchMovieIds(candidates, {
      activeRaterCount: 10,
      size: 10,
      requeueCap: 3,
      random: () => 0,
    });
    expect(new Set(swapped.filter((id) => id !== 20)).size).toBe(3);
    expect(swapped).toContain(20);
    expect(swapped).not.toEqual(stable);
  });

  it('skips re-queue when skip ratio is at or above the threshold', () => {
    const picked = pickNextBatchMovieIds(
      [
        row({
          movieId: 1,
          appearanceCount: 1,
          ratingCount: 1,
          skipCount: 7, // 7/10 = 0.7
        }),
        row({ movieId: 2, nominationCount: 2 }),
      ],
      { activeRaterCount: 10, size: 10, skipThreshold: 0.7 }
    );
    expect(picked).toEqual([2]);
  });

  it('skips re-queue after max appearances', () => {
    const picked = pickNextBatchMovieIds(
      [
        row({
          movieId: 1,
          appearanceCount: 3,
          ratingCount: 2,
        }),
        row({ movieId: 2 }),
      ],
      { activeRaterCount: 10, size: 10, maxAppearances: 3 }
    );
    expect(picked).toEqual([2]);
  });

  it('does not re-queue movies that already qualify', () => {
    const picked = pickNextBatchMovieIds(
      [
        row({
          movieId: 1,
          appearanceCount: 1,
          ratingCount: 5,
        }),
        row({ movieId: 2 }),
      ],
      { activeRaterCount: 10, size: 10 }
    );
    expect(picked).toEqual([2]);
  });
});

describe('formatOpenBatchCaption', () => {
  const movies = [
    { title: 'Heat', releaseDate: new Date('1995-12-15T00:00:00.000Z') },
    { title: 'A & B', releaseDate: new Date('2010-01-01T00:00:00.000Z') },
  ];

  it('puts the movie list and the site link in one caption', () => {
    const caption = formatOpenBatchCaption({
      batchNumber: 4,
      movies,
      voteUrl: 'https://www.elvipdemm.com/imdb-lta/lote',
    });

    expect(caption).toContain('IMDB LTA · Lote #4');
    expect(caption).toContain('1. Heat (1995)');
    expect(caption).toContain('2. A &amp; B (2010)');
    expect(caption).toContain(
      '<a href="https://www.elvipdemm.com/imdb-lta/lote">Votar el lote</a>'
    );
    expect(caption).not.toContain('Recordatorio');
  });

  it('uses the reminder copy and still includes posters caption pieces', () => {
    const caption = formatOpenBatchCaption({
      batchNumber: 4,
      movies,
      voteUrl: 'https://www.elvipdemm.com/imdb-lta/lote',
      reminder: true,
    });

    expect(caption).toContain(
      'Recordatorio:</b> Voten el lote actual así podemos seguir con los jueguitos, trivias y más lotes.'
    );
    expect(caption).toContain('1. Heat (1995)');
    expect(caption).toContain(
      '<a href="https://www.elvipdemm.com/imdb-lta/lote">Votar el lote</a>'
    );
  });

  it('falls back to a plain url when the site is not https', () => {
    const caption = formatOpenBatchCaption({
      batchNumber: 1,
      movies,
      voteUrl: 'http://localhost:3000/imdb-lta/lote',
    });

    expect(caption).toContain('<code>http://localhost:3000/imdb-lta/lote</code>');
    expect(caption).not.toContain('<a href=');
  });
});
