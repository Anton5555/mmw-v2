import { getMamMovies } from '@/lib/api/mam';
import { getMamParticipantBySlug } from '@/lib/api/mam';
import { loadMamMoviesSearchParams } from '@/lib/searchParams';
import { MamMovieCard } from '@/components/mam-movie-card';
import { Film } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ParticipantPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return '??';
  const firstLetter = words[0]?.[0]?.toUpperCase() || '?';
  if (words.length === 1) {
    const secondLetter = words[0]?.[1]?.toUpperCase() || firstLetter;
    return (firstLetter + secondLetter).slice(0, 2);
  }
  const lastLetter = words[words.length - 1]?.[0]?.toUpperCase() || firstLetter;
  return (firstLetter + lastLetter).slice(0, 2);
}

export default async function ParticipantPage({
  params,
  searchParams,
}: ParticipantPageProps) {
  const { slug } = await params;

  // Get participant by slug
  const participant = await getMamParticipantBySlug(slug);

  if (!participant) {
    notFound();
  }

  // Load and validate search parameters
  const { title, imdb, page, limit } = await loadMamMoviesSearchParams(
    searchParams
  );

  // Fetch movies filtered by this participant
  const moviesData = await getMamMovies({
    title,
    imdb,
    participants: slug, // Filter by this participant's slug
    page,
    limit,
  });

  const { movies, pagination } = moviesData;

  // Get the participant's pick for each movie to show their review/score
  const moviesWithPicks = movies.map((movie) => {
    const participantPick = movie.picks.find(
      (pick) => pick.participant.slug === slug
    );
    return {
      movie,
      userPick: participantPick
        ? {
            review: participantPick.review,
            score: participantPick.score,
          }
        : undefined,
    };
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/mam">
                <span className="font-bold tracking-tight">← Volver a MAM</span>
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16 border-2 border-yellow-500">
              <AvatarImage
                src={participant.user?.image || undefined}
                alt={participant.displayName}
              />
              <AvatarFallback className="bg-yellow-500/20 text-yellow-500 text-lg font-bold">
                {getInitials(participant.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold mb-2">{participant.displayName}</h1>
              <p className="text-muted-foreground">
                Lista personal de Míralas Antes de Morir
              </p>
            </div>
          </div>
        </div>

        {/* Results Count */}
        {movies.length > 0 && (
          <div className="mb-6">
            <p className="text-muted-foreground text-sm">
              Mostrando {movies.length} de {pagination.totalCount} películas
            </p>
          </div>
        )}

        {/* Movie Grid */}
        {movies.length === 0 ? (
          <div className="text-center py-12">
            <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              No hay películas en esta lista
            </h3>
            <p className="text-muted-foreground">
              {participant.displayName} aún no ha seleccionado películas para su
              lista personal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {moviesWithPicks.map(({ movie, userPick }) => (
              <MamMovieCard
                key={movie.id}
                movie={movie}
                userPick={userPick}
                showReview={true}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {pagination.hasPrevPage && (
              <Link
                href={`/mam/participant/${slug}?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries({ title, imdb }).filter(
                      ([, value]) => value !== ''
                    )
                  ),
                  page: (page - 1).toString(),
                }).toString()}`}
                className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
              >
                Anterior
              </Link>
            )}

            <span className="px-3 py-2 text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>

            {pagination.hasNextPage && (
              <Link
                href={`/mam/participant/${slug}?${new URLSearchParams({
                  ...Object.fromEntries(
                    Object.entries({ title, imdb }).filter(
                      ([, value]) => value !== ''
                    )
                  ),
                  page: (page + 1).toString(),
                }).toString()}`}
                className="px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
              >
                Siguiente
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
