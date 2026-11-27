import type { TriviaGameView } from '@/lib/api/imdb-lta-trivia';
import type { TriviaPanelGame } from './imdb-lta-trivia-panel';

export function toTriviaPanelGame(game: TriviaGameView): TriviaPanelGame {
  return {
    id: game.id,
    number: game.number,
    status: game.status,
    imageStep: game.imageStep,
    backdropPath: game.backdropPath,
    focusX: game.focusX,
    focusY: game.focusY,
    movie: {
      id: game.movie.id,
      title: game.movie.title,
      originalTitle: game.movie.originalTitle,
      year: game.movie.releaseDate.getUTCFullYear(),
      posterUrl: game.movie.posterUrl,
      imdbId: game.movie.imdbId,
    },
    host: game.host,
  };
}
