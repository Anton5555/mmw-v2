'use client';

import { List } from '@prisma/client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from './ui/carousel';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Play } from 'lucide-react';
import { useFilmSlate } from '@/lib/contexts/film-slate-context';

export const ListsCarousel = ({
  lists,
  verified,
}: {
  lists: List[];
  verified: boolean;
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { triggerSlate } = useFilmSlate();

  useEffect(() => {
    if (!api) return;

    const updateCurrent = () => {
      setCurrent(api.selectedScrollSnap());
    };

    // Set initial state
    updateCurrent();

    // Subscribe to changes
    api.on('select', updateCurrent);

    return () => {
      api.off('select', updateCurrent);
    };
  }, [api]);

  useEffect(() => {
    if (verified) {
      toast.success('Email verificado. ¡Disfruta de la web!', {
        description: 'Recuerda no romper nada, por favor.',
      });
    }
  }, [verified]);

  return (
    <div className="group relative w-full overflow-hidden">
      <Carousel
        setApi={setApi}
        opts={{
          align: 'center',
          loop: true,
          duration: 40, // Smoother glide
        }}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {lists.map((list, index) => (
            <CarouselItem
              key={list.id}
              className="relative basis-full pl-0 transition-opacity duration-700"
              style={{ opacity: current === index ? 1 : 0.4 }}
            >
              <div className="relative h-[60vh] min-h-[450px] w-full lg:h-[75vh]">
                {/* Image with subtle zoom effect */}
                <Image
                  src={list.imgUrl}
                  alt={list.name}
                  className="h-full w-full object-cover transition-transform duration-[10s] ease-linear group-hover:scale-105"
                  fill
                  priority={index === 0}
                />

                {/* Sophisticated Cinematic Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent hidden md:block" />

                {/* Content Alignment */}
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 px-6 md:items-start md:px-20 lg:pb-24">
                  <div className="space-y-4 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
                    <span className="inline-block px-3 py-1 rounded-full bg-yellow-500 text-[10px] font-black uppercase tracking-widest text-black italic">
                      Destacado
                    </span>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl md:text-6xl lg:text-7xl">
                      {list.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4">
                      <Button
                        size="lg"
                        onClick={() => triggerSlate(list.name, `/lists/${list.id}`)}
                        className="h-14 bg-white px-8 text-black hover:bg-yellow-500 hover:text-black font-bold uppercase italic shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                      >
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        Ver Lista
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Progress Indicators (The dots at the bottom) */}
      <div className="absolute bottom-6 right-0 left-0 flex justify-center gap-2 md:justify-start md:left-20">
        {lists.map((_, i) => (
          <button
            key={i}
            onClick={() => api?.scrollTo(i)}
            className={cn(
              'h-1 rounded-full transition-all duration-300',
              current === i
                ? 'w-8 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                : 'w-2 bg-white/20 hover:bg-white/40'
            )}
          />
        ))}
      </div>
    </div>
  );
};
