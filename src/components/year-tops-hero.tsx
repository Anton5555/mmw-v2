'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface YearTopsHeroProps {
  availableYears: number[];
}

interface ArchiveCardProps {
  title: string;
  href: string;
  desc: string;
}

function ArchiveCard({ title, href, desc }: ArchiveCardProps) {
  return (
    <Link href={href}>
      <div className="rounded-xl border border-white/10 bg-zinc-900 p-6 hover:border-white/20 hover:bg-zinc-900/80 transition-colors">
        <h2 className="text-xl font-semibold mb-1 text-white">{title}</h2>
        <p className="text-zinc-400 text-sm">{desc}</p>
      </div>
    </Link>
  );
}

export function YearTopsHero({ availableYears }: YearTopsHeroProps) {
  const [selectedYear, setSelectedYear] = useState(
    availableYears[0] || new Date().getFullYear()
  );

  return (
    <div className="space-y-12">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
          Top del año
        </h1>
        <p className="mt-2 text-zinc-400">
          Listas anuales de la comunidad.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                'px-4 py-1.5 rounded-lg border text-sm font-mono transition-colors',
                selectedYear === year
                  ? 'bg-white text-black border-white'
                  : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-500 hover:text-zinc-300'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ArchiveCard
          title="Top del año"
          href={`/year-tops/top-10?year=${selectedYear}`}
          desc="Las mejores de la cosecha."
        />
        {selectedYear === 2025 && (
          <ArchiveCard
            title="Mejor vista"
            href={`/year-tops/best-seen?year=${selectedYear}`}
            desc="Joyas descubiertas este año."
          />
        )}
        <ArchiveCard
          title="Porongas del año"
          href={`/year-tops/worst-3?year=${selectedYear}`}
          desc="Lo más bajo del séptimo arte."
        />
        <ArchiveCard
          title="Duales"
          href={`/year-tops/best-and-worst?year=${selectedYear}`}
          desc="Películas que aparecen en ambos listados."
        />
      </div>
    </div>
  );
}
