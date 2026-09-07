import { useQueryStates } from 'nuqs';
import { imdbLtaRateSearchParams } from '../searchParams';

export function useImdbLtaRateParams() {
  const [params, setParams] = useQueryStates(imdbLtaRateSearchParams, {
    shallow: false,
    history: 'replace',
  });

  return { params, setParams };
}
