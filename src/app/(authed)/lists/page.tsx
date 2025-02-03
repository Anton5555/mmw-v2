import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getLists } from '@/lib/api/lists';
import Image from 'next/image';

const ListsPage = async () => {
  const lists = await getLists();

  return (
    <div className="container mx-auto px-4 pb-8 pt-4">
      {lists.length === 0 ? (
        <div>
          <p>No lists found. Create a list to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <Link href={`/lists/${list.id}`} key={list.id} className="group">
              <Card className="relative h-full min-h-56 overflow-hidden transition-all duration-300 hover:shadow-lg">
                {list.imgUrl && (
                  <Image
                    src={list.imgUrl}
                    alt={list.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="transition-all duration-300 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-black/70" />
                <div className="relative z-10 flex h-full flex-col p-4">
                  <CardHeader className="p-0">
                    <CardTitle className="text-xl font-bold text-white">
                      {list.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="mt-2 flex-grow p-0">
                    <p className="text-sm text-white/90">{list.description}</p>
                  </CardContent>
                  <div className="mt-auto pt-2">
                    <p className="text-xs text-white/80">
                      A pedido de: {list.createdBy}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListsPage;
