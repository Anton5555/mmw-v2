import { getListById, getListMovies } from '@/lib/api/lists';
import { MovieGrid } from '@/components/movie-grid';
import { ListBreadcrumbUpdater } from '@/components/list-breadcrumb-updater';
import Image from 'next/image';
import Link from 'next/link';
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
    <>
      <ListBreadcrumbUpdater listName={list.name} />

      <div>
        <div className="relative mb-8">
          <Image
            src={list.imgUrl}
            alt={list.name}
            width={1024}
            height={720}
            className="w-full h-[calc(70vh)] object-cover"
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="bg-linear-to-t from-black/80 via-black/40 to-transparent px-8 py-8">
              <div className="container mx-auto">
                <div className="flex flex-row justify-between">
                  <div className="flex flex-col">
                    <div className="flex flex-row gap-2  mb-4 items-end">
                      <h1 className="text-4xl font-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                        {list.name}
                      </h1>

                      <p className="text-xl italic text-white/90 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                        by {list.createdBy}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <Link href={list.letterboxdUrl} target="_blank">
                      <Image
                        src={
                          'https://a.ltrbxd.com/logos/letterboxd-mac-icon.png'
                        }
                        alt={'Letterboxd'}
                        width={200}
                        height={200}
                        className="w-16 h-16"
                      />
                    </Link>
                  </div>
                </div>
                <p className="text-xl text-white/90 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
                  {list.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4">
          <MovieGrid
            initialMovies={movies}
            listId={listId}
            hasMore={hasMore}
            totalMovies={totalMovies}
          />
        </div>
      </div>
    </>
  );
}
