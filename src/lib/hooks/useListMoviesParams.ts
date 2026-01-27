import { useQueryStates } from 'nuqs';
import { parseAsString, parseAsArrayOf } from 'nuqs';

// Define search params for list filters
const listMoviesSearchParams = {
  title: parseAsString.withDefault(''),
  genre: parseAsArrayOf(parseAsString).withDefault([]),
  director: parseAsArrayOf(parseAsString).withDefault([]),
  country: parseAsArrayOf(parseAsString).withDefault([]),
};

export function useListMoviesParams() {
  const [params, setParams] = useQueryStates(listMoviesSearchParams, {
    shallow: false,
    history: 'replace', // Use replace to avoid cluttering browser history
    throttleMs: 500, // Debouncing for search inputs
  });

  return { params, setParams };
}
