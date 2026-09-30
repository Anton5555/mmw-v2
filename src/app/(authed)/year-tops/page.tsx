import { Suspense } from 'react';
import { connection } from 'next/server';
import { prisma } from '@/lib/db';
import { YearTopsHero } from '@/components/year-tops-hero';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

export default function YearTopsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <YearTopsPageContent />
    </Suspense>
  );
}

async function YearTopsPageContent() {
  // Opt into per-request rendering so new Date() usage downstream stays legal
  await connection();

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
    <div className="min-h-svh bg-[#0a0a0a] text-white selection:bg-yellow-500/30">
      <div className="container mx-auto px-4 py-12">
        <YearTopsHero availableYears={availableYears} />
      </div>
    </div>
  );
}
