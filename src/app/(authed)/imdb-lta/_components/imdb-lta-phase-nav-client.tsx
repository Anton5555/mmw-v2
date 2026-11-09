'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type PhaseNavTab = {
  href: string;
  label: string;
};

type ImdbLtaPhaseNavClientProps = {
  tabs: PhaseNavTab[];
  currentPath: string;
};

export function ImdbLtaPhaseNavClient({
  tabs,
  currentPath,
}: ImdbLtaPhaseNavClientProps) {
  const router = useRouter();
  const activeTab =
    tabs.find((tab) =>
      tab.href === '/imdb-lta'
        ? currentPath === '/imdb-lta'
        : currentPath.startsWith(tab.href)
    ) ?? tabs[0];

  return (
    <nav className="mb-6 border-b border-white/10 pb-4 sm:mb-8">
      {/* Mobile: compact dropdown — pills stack badly on a narrow screen */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-full bg-yellow-500 px-4 py-2.5 text-left text-xs font-black uppercase tracking-widest text-black transition hover:bg-yellow-400"
            >
              <span>{activeTab?.label ?? 'Sección'}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[min(100vw-2rem,20rem)] border-white/10 bg-zinc-950"
          >
            {tabs.map((tab) => {
              const active =
                tab.href === '/imdb-lta'
                  ? currentPath === '/imdb-lta'
                  : currentPath.startsWith(tab.href);
              return (
                <DropdownMenuItem
                  key={tab.href}
                  className={cn(
                    'cursor-pointer text-xs font-black uppercase tracking-widest',
                    active
                      ? 'bg-yellow-500/20 text-yellow-300 focus:bg-yellow-500/25 focus:text-yellow-200'
                      : 'text-zinc-300 focus:bg-zinc-900 focus:text-white'
                  )}
                  onSelect={() => {
                    if (!active) router.push(tab.href);
                  }}
                >
                  {tab.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: horizontal pills */}
      <div className="hidden flex-wrap gap-2 sm:flex">
        {tabs.map((tab) => {
          const active =
            tab.href === '/imdb-lta'
              ? currentPath === '/imdb-lta'
              : currentPath.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'cursor-pointer rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest transition',
                active
                  ? 'bg-yellow-500 text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
