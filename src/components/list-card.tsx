'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useFilmSlate } from '@/lib/contexts/film-slate-context';
import { List } from '@prisma/client';

interface ListCardProps {
  list: List;
}

export function ListCard({ list }: ListCardProps) {
  const { triggerSlate } = useFilmSlate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    triggerSlate(list.name, `/lists/${list.id}`);
  };

  return (
    <Link
      href={`/lists/${list.id}`}
      onClick={handleClick}
      className="group relative"
    >
      <Card className="relative aspect-video w-full overflow-hidden border-none bg-muted shadow-lg transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-primary/20">
        {/* Background Image */}
        {list.imgUrl ? (
          <Image
            src={list.imgUrl}
            alt={list.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-950" />
        )}

        {/* Gradient Overlay - Darker at bottom for text, lighter at top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 transition-opacity group-hover:opacity-90" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <div className="translate-y-4 transition-transform duration-300 group-hover:translate-y-0">
            <h3 className="text-xl font-black leading-tight text-white line-clamp-1 uppercase tracking-wide">
              {list.name}
            </h3>

            {/* Description - Hidden or collapsed initially, expands on hover if you prefer */}
            <p className="mt-2 line-clamp-2 text-sm text-gray-200 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {list.description}
            </p>

            <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
              <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-white/60">
                <User className="mr-1 h-3 w-3" />
                Pedido por:{' '}
                <span className="ml-1 text-white">
                  {list.createdBy}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Border Glow on Hover */}
        <div className="absolute inset-0 rounded-xl border border-white/0 transition-colors duration-300 group-hover:border-white/20" />
      </Card>
    </Link>
  );
}
