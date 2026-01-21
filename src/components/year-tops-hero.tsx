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
  color: 'yellow' | 'green' | 'red';
  desc: string;
}

function ArchiveCard({ title, href, color, desc }: ArchiveCardProps) {
  const colorClasses = {
    yellow: 'from-yellow-500/20 to-transparent',
    green: 'from-green-500/20 to-transparent',
    red: 'from-red-500/20 to-transparent',
  };

  return (
    <Link href={href}>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-8 hover:bg-white/10 transition-all duration-300 group">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm">{desc}</p>
        <div
          className={cn(
            'absolute bottom-0 right-0 w-32 h-32 bg-linear-to-tl rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity',
            colorClasses[color]
          )}
        />
      </div>
    </Link>
  );
}

export function YearTopsHero({ availableYears }: YearTopsHeroProps) {
  const [selectedYear, setSelectedYear] = useState(
    availableYears[0] || new Date().getFullYear()
  );

  return (
    <div className="space-y-16">
      <div className="text-center md:text-left">
        <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter">
          Top del <span className="text-yellow-500">Año</span>
        </h1>

        {/* YEAR SELECTION STRIP */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={cn(
                'px-6 py-2 rounded-full border transition-all duration-200 font-mono text-xl',
                selectedYear === year
                  ? 'bg-white text-black border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                  : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-500'
              )}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <ArchiveCard
          title="Top del Año"
          href={`/year-tops/top-10?year=${selectedYear}`}
          color="yellow"
          desc="Las mejores de la cosecha."
        />
        {selectedYear === 2025 && (
          <ArchiveCard
            title="Mejor Vista"
            href={`/year-tops/best-seen?year=${selectedYear}`}
            color="green"
            desc="Joyas descubiertas este año."
          />
        )}
        <ArchiveCard
          title="Porongas del Año"
          href={`/year-tops/worst-3?year=${selectedYear}`}
          color="red"
          desc="Lo más bajo del séptimo arte."
        />
        <ArchiveCard
          title="Duales"
          href={`/year-tops/best-and-worst?year=${selectedYear}`}
          color="yellow"
          desc="Películas que aparecen en ambos listados."
        />
      </div>
    </div>
  );
}
