import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getImdbLtaPhase, listAdminRatingSnapshot } from '@/lib/api/imdb-lta';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { ImdbLtaPhaseNav } from '../_components/imdb-lta-phase-nav';
import {
  ImdbLtaAdminRatings,
  type AdminRatingsView,
} from '../_components/imdb-lta-admin-ratings';

const votedAtFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
});

export default function ImdbLtaAdminVotesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImdbLtaAdminVotesPageContent />
    </Suspense>
  );
}

async function ImdbLtaAdminVotesPageContent() {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect('/api/auth/clear-session');
  }

  if (session.user.role !== 'admin') {
    redirect('/imdb-lta');
  }

  const [phase, snapshot] = await Promise.all([
    getImdbLtaPhase(),
    listAdminRatingSnapshot(),
  ]);

  const view: AdminRatingsView = {
    movieCount: snapshot.movieCount,
    totalRatings: snapshot.totalRatings,
    voterCount: snapshot.voterCount,
    movies: snapshot.movies.map((movie) => ({
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      posterUrl: movie.posterUrl,
      imdbId: movie.imdbId,
      ratingCount: movie.ratingCount,
      averageScore: movie.averageScore,
      votes: movie.votes.map((vote) => ({
        userId: vote.userId,
        name: vote.name,
        score: vote.score,
        votedAt: votedAtFormatter.format(vote.createdAt),
      })),
    })),
    people: snapshot.people.map((person) => ({
      userId: person.userId,
      name: person.name,
      ratingCount: person.ratingCount,
      averageScore: person.averageScore,
      ratings: person.ratings.map((rating) => ({
        movieId: rating.movieId,
        title: rating.title,
        score: rating.score,
        votedAt: votedAtFormatter.format(rating.createdAt),
      })),
    })),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <ImdbLtaPhaseNav
          phase={phase}
          currentPath="/imdb-lta/admin"
          isAdmin
        />

        <header className="mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-yellow-400">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-black uppercase italic tracking-tight">
            Votos
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Promedio de cada película y el puntaje de cada persona.
          </p>
        </header>

        <ImdbLtaAdminRatings snapshot={view} />
      </div>
    </div>
  );
}
