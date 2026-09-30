import { Suspense } from 'react';
import Link from 'next/link';
import { getLists } from '@/lib/api/lists';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ListCard } from '@/components/list-card';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function ListsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ListsPageContent />
    </Suspense>
  );
}

async function ListsPageContent() {
  const session = await getCurrentSession();

  const isAdmin = session?.user.role === 'admin';
  const lists = await getLists();

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="container mx-auto px-4 pb-10 pt-6">
        {/* Header Section */}
        <header className="mb-10 flex items-end justify-between gap-4 pt-4 md:pt-8">
          <div className="space-y-2">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
              Listas
            </h1>
            <p className="text-pretty text-zinc-400">
              Colecciones curadas por la comunidad.
            </p>
          </div>

          {isAdmin && (
            <Button asChild className="h-10 shrink-0 rounded-lg px-4">
              <Link href="/lists/new">
                <Plus />
                Crear lista
              </Link>
            </Button>
          )}
        </header>

        {lists.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted">
            <p className="text-muted-foreground">
              No se encontraron listas. ¡Crea la primera!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-6">
            {lists.map((list) => (
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
