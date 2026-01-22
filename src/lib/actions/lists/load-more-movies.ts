'use server';

import { getListMovies, ListMoviesInput } from '@/lib/api/lists';

export const loadMoreMoviesAction = async (parsedInput: ListMoviesInput) =>
  await getListMovies(parsedInput);
