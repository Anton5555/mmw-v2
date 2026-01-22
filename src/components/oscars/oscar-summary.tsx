'use client';

import { useRef } from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { OscarIcon } from '@/components/icons/oscar-icon';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { UserBallot } from '@/lib/validations/oscars';
import Image from 'next/image';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';

interface OscarSummaryProps {
  ballot: UserBallot;
  editionYear: number;
}

export function OscarSummary({ ballot, editionYear }: OscarSummaryProps) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const totalCategories = ballot.picks.length;
  const currentScore = ballot.score ?? null;

  // Determine if a category is technical (for styling)
  const isTechnicalCategory = (slug: string) => {
    return (
      slug.includes('cinematography') ||
      slug.includes('editing') ||
      slug.includes('sound') ||
      slug.includes('visual-effects') ||
      slug.includes('production-design') ||
      slug.includes('costume') ||
      slug.includes('makeup') ||
      slug.includes('casting')
    );
  };

  // Determine if a category should show poster (film categories)
  const shouldShowPoster = (slug: string) => {
    return (
      slug === 'best-picture' ||
      slug === 'animated-feature-film' ||
      slug === 'documentary-feature-film' ||
      slug === 'international-feature-film'
    );
  };

  const handleDownloadImage = async () => {
    if (!summaryRef.current) {
      toast.error('Error al generar la imagen');
      return;
    }

    try {
      toast.loading('Generando imagen...', { id: 'download-image' });

      // Wait a bit to ensure all images are loaded
      await new Promise((resolve) => setTimeout(resolve, 500));

      const dataUrl = await toPng(summaryRef.current, {
        backgroundColor: '#0a0a0a',
        quality: 1.0,
        pixelRatio: 2,
        cacheBust: true,
        fontEmbedCSS: '',
        includeQueryParams: true,
        skipAutoScale: false,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `los-oscalos-${editionYear}-${new Date().getTime()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Imagen descargada exitosamente', { id: 'download-image' });
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Error al generar la imagen', { id: 'download-image' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="space-y-12"
    >
      <div
        ref={summaryRef}
        className="space-y-12 bg-[#0a0a0a] p-8 rounded-2xl w-full"
      >
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-center justify-between p-8 rounded-2xl bg-zinc-900/50 border border-yellow-500/20 backdrop-blur-sm gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <OscarIcon className="text-yellow-500 h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold italic">Los Oscalos {editionYear}</h2>
            <p className="text-sm text-zinc-500">
              Voto registrado el {new Date(ballot.submittedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="text-center md:text-right">
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Puntuación Actual
          </div>
          <div className="text-3xl font-black text-white">
            {currentScore !== null ? `${currentScore} / ${totalCategories}` : '-- / ' + totalCategories}
          </div>
        </div>
      </div>

      {/* Selections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ballot.picks.map((pick, i) => {
          const showPoster = shouldShowPoster(pick.category.slug);
          const isTechnical = isTechnicalCategory(pick.category.slug);
          const movieTitle = pick.nominee.filmTitle || pick.nominee.movie?.title || '';

          return (
            <div
              key={pick.id}
              className={cn(
                'group relative overflow-hidden rounded-xl border border-white/5 bg-zinc-900/30 p-5 transition-all hover:border-white/20',
                showPoster && pick.nominee.movie?.posterUrl && 'min-h-[200px]'
              )}
            >
              {/* Background poster for film categories */}
              {showPoster && pick.nominee.movie?.posterUrl && (
                <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Image
                    src={pick.nominee.movie.posterUrl}
                    alt={pick.nominee.movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="relative flex flex-col h-full space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500/70">
                    {pick.category.name}
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-yellow-500 opacity-50 shrink-0" />
                </div>

                <div className="space-y-1 flex-1">
                  <h3 className="font-bold text-lg leading-tight group-hover:text-yellow-500 transition-colors">
                    {pick.nominee.name}
                  </h3>
                  {movieTitle && (
                    <p className="text-sm text-zinc-400 italic">{movieTitle}</p>
                  )}
                </div>

                {/* Decorative background element for the card */}
                <div className="absolute -bottom-2 -right-2 text-white/5 font-black text-6xl italic pointer-events-none select-none">
                  {i + 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      </div>

      {/* Share Section */}
      <div className="flex flex-col items-center gap-4 pt-8 border-t border-white/5">
        <p className="text-zinc-500 text-sm">
          Comparte tus predicciones con la comunidad
        </p>
        <Button
          variant="outline"
          className="rounded-full border-white/10 hover:bg-white/5 select-none"
          onClick={handleDownloadImage}
        >
          <Download className="w-4 h-4 mr-2" />
          Descargar Imagen
        </Button>
      </div>
    </motion.div>
  );
}
