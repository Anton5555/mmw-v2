import { parseAsInteger, parseAsString, createLoader } from 'nuqs/server';

export const eventsSearchParams = {
  month: parseAsInteger.withDefault(new Date().getMonth() + 1),
  year: parseAsInteger.withDefault(new Date().getFullYear()),
};

export const loadEventsSearchParams = createLoader(eventsSearchParams);

// MAM movie search parameters - simplified to match v0 design
export const mamMoviesSearchParams = {
  title: parseAsString.withDefault(''),
  imdb: parseAsString.withDefault(''),
  participants: parseAsString.withDefault(''), // comma-separated participant slugs
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(30),
};

export const loadMamMoviesSearchParams = createLoader(mamMoviesSearchParams);
