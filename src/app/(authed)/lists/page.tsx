import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { getLists } from '@/lib/api/lists';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Plus, User } from 'lucide-react';

export default async function ListsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAdmin = session?.user.role === 'admin';
  const lists = await getLists();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-10">
        {/* Header Section */}
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Listas
            </h1>
            <p className="text-muted-foreground mt-1">
              Colecciones curadas por la comunidad.
            </p>
          </div>

          {isAdmin && (
            <Button
              asChild
              className="shrink-0 font-bold shadow-xl transition-transform active:scale-95"
            >
              <Link href="/lists/new">
                <Plus className="mr-2 h-5 w-5" />
                Crear lista
              </Link>
            </Button>
          )}
        </div>

        {lists.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted">
            <p className="text-muted-foreground">
              No se encontraron listas. ¡Crea la primera!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <Link
                href={`/lists/${list.id}`}
                key={list.id}
                className="group relative"
              >
                <Card className="relative aspect-video w-full overflow-hidden border-none bg-muted shadow-lg transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-primary/20">
                  {/* Background Image */}
                  {list.imgUrl ? (
                    <Image
                      src={list.imgUrl}
                      alt={list.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-950" />
                  )}

                  {/* Gradient Overlay - Darker at bottom for text, lighter at top */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    <div className="translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
                      <h3 className="text-xl font-black leading-tight text-white line-clamp-1 uppercase tracking-wide">
                        {list.name}
                      </h3>

                      {/* Description - Hidden or collapsed initially, expands on hover if you prefer */}
                      <p className="mt-2 line-clamp-2 text-sm text-gray-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        {list.description}
                      </p>

                      <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-white/60">
                          <User className="mr-1 h-3 w-3" />
                          Pedido por:{' '}
                          <span className="ml-1 text-white">
                            {list.createdBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle Border Glow on Hover */}
                  <div className="absolute inset-0 rounded-xl border border-white/0 transition-colors duration-300 group-hover:border-white/20" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
