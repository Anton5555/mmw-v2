'use server';

import { getMovieById } from '@/lib/tmdb';

export interface MoviePreview {
  title: string;
  originalTitle: string;
  posterUrl: string;
  imdbId: string;
}

export async function previewMoviesAction(movieIds: string[]) {
  if (movieIds.length === 0) {
    throw new Error('No se proporcionaron IDs de IMDB');
  }

  const previews = await Promise.all(
    movieIds.map(async (imdbId) => {
      const movieData = await getMovieById(imdbId);
      if (!movieData) {
        throw new Error(
          `No se pudo obtener la información de la película ${imdbId}`
        );
      }
      return {
        title: movieData.title,
        originalTitle: movieData.original_title,
        posterUrl: movieData.poster_path || '',
        imdbId: movieData.imdbId,
      };
    })
  );

  return previews;
}
