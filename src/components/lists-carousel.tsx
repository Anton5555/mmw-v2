'use client';

import { List } from '@prisma/client';
import { Suspense, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';

export const ListsCarousel = ({
  lists,
  verified,
}: {
  lists: List[];
  verified: boolean;
}) => {
  useEffect(() => {
    if (verified) {
      const timer = setTimeout(() => {
        toast.success(
          'Email verificado correctamente, disfruta de la web sin romper nada!'
        );
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [verified]);

  return (
    <div className="relative mx-auto w-full max-w-7xl md:px-8">
      <Carousel
        opts={{
          align: 'center',
          loop: true,
          duration: 500,
          dragFree: false,
        }}
      >
        <CarouselContent>
          {lists.map((list) => (
            <CarouselItem
              key={list.id}
              className="relative basis-full md:basis-4/5"
            >
              <Suspense
                fallback={
                  <Skeleton className="h-96 w-full rounded-lg lg:h-[calc(70vh)]" />
                }
              >
                <Image
                  src={list.imgUrl}
                  alt={list.name}
                  className="h-96 w-full rounded-lg object-cover lg:h-[calc(70vh)]"
                  width={1024}
                  height={720}
                  priority
                />
              </Suspense>

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40">
                <h2 className="max-w-full text-center text-3xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  {list.name}
                </h2>
                <Link href={`/lists/${list.id}`}>
                  <Button size="lg">Ver lista</Button>
                </Link>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
