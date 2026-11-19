'use client';

import Link from 'next/link';
import Image from 'next/image';
import { User } from 'lucide-react';
import { useFilmSlate } from '@/lib/contexts/film-slate-context';
import { List } from '@generated/prisma/client';

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
      className="group relative block rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm bg-card ring-1 ring-border transition-[transform,box-shadow] duration-300 ease-out group-hover:ring-primary/70 [@media(hover:hover)_and_(pointer:fine)]:group-hover:-translate-y-1">
        {list.imgUrl ? (
          <Image
            src={list.imgUrl}
            alt=""
            fill
            className="object-cover transition-transform duration-500 ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
          />
        ) : null}

        {/* Ink scrim: solid at the bottom so text reads over any still */}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent to-75%" />

        {/* Title sits on the requester; hover opens room for the description */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col p-4 sm:p-5">
          <h3 className="text-balance font-display text-xl font-bold uppercase leading-[1.05] sm:text-2xl text-foreground">
            {list.name}
          </h3>

          {list.description ? (
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] motion-reduce:transition-none [@media(hover:none)]:grid-rows-[1fr]">
              <div className="min-h-0 overflow-hidden">
                <p className="mt-2 line-clamp-4 text-sm leading-snug [@media(hover:none)]:line-clamp-2 text-foreground/85 opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100">
                  {list.description}
                </p>
              </div>
            </div>
          ) : null}

          <p className="mt-3 flex min-w-0 items-center gap-1 border-t border-foreground/15 pt-3 text-xs text-muted-foreground">
            <User className="size-3 shrink-0" aria-hidden />
            Pedido por{' '}
            <span className="truncate font-semibold text-foreground">
              {list.createdBy}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
