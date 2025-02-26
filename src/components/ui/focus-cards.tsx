'use client';

import Image from 'next/image';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export const Card = React.memo(
  ({
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
  }) => (
    <div
      onMouseEnter={() => setHovered(index)}
      onMouseLeave={() => setHovered(null)}
      className={cn(
        'rounded-lg relative overflow-hidden transition-all duration-300 ease-out',
        hovered !== null && hovered !== index && 'blur-sm scale-[0.98]',
        className
      )}
    >
      <div className="relative aspect-[2/3]">
        <Image
          src={card.src}
          alt={card.title}
          className="object-cover"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized
        />
      </div>

      {/* Background overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          hovered === index ? 'opacity-20' : 'opacity-0'
        )}
      />

      {/* Title container */}
      <div
        className={cn(
          'absolute inset-0 flex items-end transition-opacity duration-300',
          hovered === index ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 py-8">
          <div className="text-xl md:text-2xl font-medium text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
            {card.title}
          </div>
        </div>
      </div>
    </div>
  )
);

Card.displayName = 'Card';

type Card = {
  id: number;
  title: string;
  src: string;
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
