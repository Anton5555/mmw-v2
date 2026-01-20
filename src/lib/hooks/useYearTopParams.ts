import { useQueryStates } from 'nuqs';
import { yearTopSearchParams } from '../searchParams';

export function useYearTopParams() {
  const [params, setParams] = useQueryStates(yearTopSearchParams, {
    shallow: false,
    history: 'replace', // Use replace to avoid cluttering browser history
    throttleMs: 500, // Debouncing for search inputs
  });

  return { params, setParams };
}
