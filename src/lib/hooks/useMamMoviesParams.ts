import { useQueryStates } from 'nuqs';
import { mamMoviesSearchParams } from '../searchParams';

export function useMamMoviesParams() {
  const [params, setParams] = useQueryStates(mamMoviesSearchParams, {
    shallow: false,
    history: 'replace', // Use replace to avoid cluttering browser history
  });

  return { params, setParams };
}
