import { useQueryStates } from 'nuqs';
import { eventsSearchParams } from '../searchParams';

export function useEventsParams() {
  const [{ month, year }, setEventsParams] = useQueryStates(
    eventsSearchParams,
    {
      shallow: false,
    }
  );

  return { month, year, setEventsParams };
}
