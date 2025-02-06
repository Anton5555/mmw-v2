'use server';

import { loadMoreMovies, loadMoreMoviesSchema } from '@/lib/api/lists';
import { actionClient } from '@/lib/safe-action';

export const loadMoreMoviesAction = actionClient
  .schema(loadMoreMoviesSchema)
  .action(async ({ parsedInput }) => {
    const result = await loadMoreMovies(parsedInput);
    return result;
  });
