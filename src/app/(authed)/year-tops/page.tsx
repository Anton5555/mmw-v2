import { prisma } from '@/lib/db';
import { headers } from 'next/headers';
import { YearTopsHero } from '@/components/year-tops-hero';

export default async function YearTopsPage() {
  // Access headers first to make route dynamic, allowing use of new Date()
  await headers();
  
  // Get available years from picks (since year was removed from YearTopParticipant)
  const years = await prisma.yearTopPick.findMany({
    select: {
      year: true,
    },
    distinct: ['year'],
    orderBy: {
      year: 'desc',
    },
  });

  const availableYears = years.map((y) => y.year);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-yellow-500/30">
      <div className="container mx-auto px-4 py-12">
        <YearTopsHero availableYears={availableYears} />
      </div>
    </div>
  );
}
