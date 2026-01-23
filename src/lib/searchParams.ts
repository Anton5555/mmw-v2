import { parseAsInteger, parseAsString, parseAsArrayOf, createLoader } from 'nuqs/server';

export const eventsSearchParams = {
  month: parseAsInteger.withDefault(new Date().getMonth() + 1),
  year: parseAsInteger.withDefault(new Date().getFullYear()),
};

export const loadEventsSearchParams = createLoader(eventsSearchParams);

// MAM movie search parameters - simplified to match v0 design
export const mamMoviesSearchParams = {
  title: parseAsString.withDefault(''),
  imdb: parseAsString.withDefault(''),
  participants: parseAsArrayOf(parseAsString).withDefault([]), // array of participant slugs
  genre: parseAsArrayOf(parseAsString).withDefault([]), // array of genre names
  director: parseAsArrayOf(parseAsString).withDefault([]), // array of director names
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(30),
};

export const loadMamMoviesSearchParams = createLoader(mamMoviesSearchParams);

// YearTop movie search parameters
export const yearTopSearchParams = {
  year: parseAsInteger.withDefault(new Date().getFullYear()),
  pickType: parseAsString.withDefault('TOP_10'), // Will be validated as enum in API
  title: parseAsString.withDefault(''),
  imdb: parseAsString.withDefault(''),
  participants: parseAsArrayOf(parseAsString).withDefault([]), // array of participant slugs
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(30),
};

export const loadYearTopSearchParams = createLoader(yearTopSearchParams);