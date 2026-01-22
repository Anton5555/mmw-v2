import { useQueryStates } from 'nuqs';
import { mamMoviesSearchParams } from '../searchParams';

export function useMamMoviesParams() {
  const [params, setParams] = useQueryStates(mamMoviesSearchParams, {
    shallow: false,
    history: 'replace', // Use replace to avoid cluttering browser history
    throttleMs: 500, // Debouncing for search inputs
  });

  return { params, setParams };
}
