import Link from 'next/link';
import { getLists } from '@/lib/api/lists';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ListCard } from '@/components/list-card';

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
              <ListCard key={list.id} list={list} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
