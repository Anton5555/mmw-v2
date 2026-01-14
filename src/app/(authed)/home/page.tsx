import { getLists } from '@/lib/api/lists';
import { getNextEvents } from '@/lib/api/events';
import { ListsCarousel } from '@/components/lists-carousel';
import { NextEvents } from '@/app/(authed)/calendar/_components/next-events';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const verified = (await searchParams).verified === 'true';
  const lists = await getLists();
  const nextEvents = await getNextEvents();

  return (
    <div className="flex flex-col gap-8">
      <div className="p-4 md:p-8">
        <ListsCarousel lists={lists} verified={verified} />
      </div>

      <div className="container mx-auto px-4 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Próximos Eventos</h2>

          <Link href="/calendar">
            <Button variant="outline" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Ver Calendario
            </Button>
          </Link>
        </div>
        <div className="bg-card rounded-lg border shadow-xs p-6">
          {nextEvents.length > 0 ? (
            <NextEvents events={nextEvents} showTitle={false} />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No hay eventos próximos</p>
              <p className="mt-2">
                Puedes crear eventos desde la página del calendario
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
