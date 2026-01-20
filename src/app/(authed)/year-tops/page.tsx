import Link from 'next/link';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export default async function YearTopsPage() {
  // Access headers first to make route dynamic, allowing use of new Date()
  await headers();
  
  // Get available years from participants
  const years = await prisma.yearTopParticipant.findMany({
    select: {
      year: true,
    },
    distinct: ['year'],
    orderBy: {
      year: 'desc',
    },
  });

  const availableYears = years.map((y) => y.year);
  const currentYear = availableYears[0] ?? new Date().getFullYear();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="container mx-auto px-4 pb-8 pt-8">
        {/* Header */}
        <div className="relative mb-12 pt-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter bg-linear-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
                Top del Año
              </h1>
              <p className="mt-3 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                Las mejores y peores películas del año según la comunidad.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href={`/year-tops/top-10?year=${currentYear}`}>
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 group">
              <h2 className="text-2xl font-bold mb-2">Top 10</h2>
              <p className="text-muted-foreground text-sm">
                Las 10 mejores películas del año
              </p>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-linear-to-tl from-yellow-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <Link href={`/year-tops/best-seen?year=${currentYear}`}>
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 group">
              <h2 className="text-2xl font-bold mb-2">Mejor Vista</h2>
              <p className="text-muted-foreground text-sm">
                La mejor película vista este año (cualquier año de estreno)
              </p>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-linear-to-tl from-green-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>

          <Link href={`/year-tops/worst-3?year=${currentYear}`}>
            <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 group">
              <h2 className="text-2xl font-bold mb-2">Peores 3</h2>
              <p className="text-muted-foreground text-sm">
                Las 3 peores películas del año
              </p>
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-linear-to-tl from-red-500/20 to-transparent rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
