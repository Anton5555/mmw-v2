'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export const Card = ({
  card,
  index,
  hovered,
  setHovered,
  className,
}: {
  card: Card;
  index: number;
  hovered: number | null;
  setHovered: React.Dispatch<React.SetStateAction<number | null>>;
  className?: string;
}) => {
  const cardContent = (
    <div
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      className={cn(
        'group relative aspect-[2/3] overflow-hidden rounded-xl transition-opacity duration-200 ease-out',
        hovered !== null && hovered !== index && 'opacity-50',
        card.href && 'cursor-pointer',
        className
      )}
    >
      <div className="h-full w-full relative">
        <Image
          src={card.src}
          alt={card.title}
          fill
          className={cn(
            'object-cover transition-transform duration-500 ease-out',
            hovered === index && '[@media(hover:hover)_and_(pointer:fine)]:scale-105'
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
        />

        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent transition-opacity duration-300',
            hovered === index ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div
          className={cn(
            'absolute inset-x-0 bottom-0 p-4 transition-[opacity,transform] duration-200 ease-out',
            hovered === index
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          )}
        >
          <p className="text-sm font-semibold tracking-tight text-white line-clamp-2">
            {card.title}
          </p>
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 transition-colors duration-200 group-hover:border-white/30" />
      </div>
    </div>
  );

  if (card.href) {
    return (
      <Link href={card.href} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

Card.displayName = 'Card';

type Card = {
  id: number;
  title: string;
  src: string;
  href?: string;
};

export function FocusCards({
  cards,
  className,
}: {
  cards: Card[];
  className?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mx-auto',
        className
      )}
    >
      {cards.map((card, index) => (
        <Card
          key={card.id}
          card={card}
          index={index}
          hovered={hovered}
          setHovered={setHovered}
        />
      ))}
    </div>
  );
}
