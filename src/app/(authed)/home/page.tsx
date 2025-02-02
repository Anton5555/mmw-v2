import { getLists } from '@/lib/api/lists';
import { ListsCarousel } from '@/components/lists-carousel';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const verified = (await searchParams).verified === 'true';
  const lists = await getLists();

  return (
    <div className="p-8">
      <ListsCarousel lists={lists} verified={verified} />
    </div>
  );
}
