import { parseAsInteger, createLoader } from 'nuqs/server';

export const eventsSearchParams = {
  month: parseAsInteger.withDefault(new Date().getMonth() + 1),
  year: parseAsInteger.withDefault(new Date().getFullYear()),
};

export const loadEventsSearchParams = createLoader(eventsSearchParams);
