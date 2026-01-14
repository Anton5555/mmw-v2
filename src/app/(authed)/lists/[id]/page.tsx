import { getListById, getListMovies } from '@/lib/api/lists';
import { MovieGrid } from '@/components/movie-grid';
import { ListBreadcrumbUpdater } from '@/components/list-breadcrumb-updater';
import { GlassButton } from '@/components/ui/glass-button';
import Image from 'next/image';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ id: string }>;
};
const ITEMS_PER_PAGE = 20;

export default async function ListPage({ params }: PageProps) {
  const listId = parseInt((await params).id);

  const list = await getListById({ id: listId });

  if (!list) {
    notFound();
  }

  const { movies, totalMovies, hasMore } = await getListMovies({
    listId,
    take: ITEMS_PER_PAGE,
    skip: 0,
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <ListBreadcrumbUpdater listName={list.name} />

      {/* Hero Section */}
      <section className="relative h-[60vh] w-full overflow-hidden md:h-[70vh]">
        <Image
          src={list.imgUrl}
          alt={list.name}
          fill
          priority
          className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
        />

        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-[#0a0a0a] via-transparent to-transparent opacity-60" />

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end pb-12">
          <div className="container mx-auto px-4 md:px-8">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-3xl space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                    Colección Curada
                  </span>
                  <h1 className="text-4xl font-black uppercase tracking-tighter md:text-6xl lg:text-7xl">
                    {list.name}
                  </h1>
                  <p className="text-lg font-medium italic text-white/60">
                    by <span className="text-white">{list.createdBy}</span>
                  </p>
                </div>

                <p className="max-w-2xl text-lg leading-relaxed text-gray-300 drop-shadow-md">
                  {list.description}
                </p>
              </div>

              {/* Letterboxd Button Styled as Glassmorphism */}
              <GlassButton
                href={list.letterboxdUrl}
                target="_blank"
                className="group"
              >
                Ver en Letterboxd
                <Image
                  src="https://a.ltrbxd.com/logos/letterboxd-mac-icon.png"
                  alt="Letterboxd"
                  width={32}
                  height={32}
                  className="h-6 w-6 brightness-110 grayscale transition-all group-hover:grayscale-0"
                />
              </GlassButton>
            </div>
          </div>
        </div>
      </section>

      {/* Movie Grid Section */}
      <section className="container mx-auto -mt-8 px-4 pb-20 md:px-8">
        <MovieGrid
          initialMovies={movies}
          listId={listId}
          hasMore={hasMore}
          totalMovies={totalMovies}
        />
      </section>
    </div>
  );
}
