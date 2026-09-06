'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  CreateListFormValues,
  createListFormSchema,
} from '@/lib/validations/lists';
import { toast } from 'sonner';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Film,
  Tag,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { createListAction } from '@/lib/actions/lists/create-list';
import {
  previewMoviesAction,
  type MoviePreview,
} from '@/lib/actions/lists/preview-list';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export function CreateListForm() {
  const router = useRouter();
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moviePreviews, setMoviePreviews] = useState<MoviePreview[]>([]);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateListFormValues>({
    resolver: zodResolver(createListFormSchema),
    defaultValues: {
      name: '',
      description: '',
      letterboxdUrl: '',
      imgUrl: '',
      tags: '',
      createdBy: '',
      movies: '',
    },
  });

  const handlePreview = async () => {
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsLoading(true);
    setError(null);
    try {
      const formData = form.getValues();
      const movieIds = formData.movies.split(',').map((id) => id.trim());
      const previews = await previewMoviesAction(movieIds);
      setMoviePreviews(previews);
      setIsPreview(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Error al obtener la vista previa';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateListFormValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await createListAction(data);
      toast.success('Lista cinematográfica creada');
      router.push('/lists');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al crear la lista';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- PREVIEW STATE ---
  if (isPreview) {
    return (
      <div className="space-y-10">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Vista previa
          </h2>
          <p className="text-zinc-500 text-sm mt-1">
            Revisá la lista antes de publicar.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
              <Image
                src={form.getValues('imgUrl')}
                alt="List preview"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white leading-tight">
                  {form.getValues('name')}
                </h1>
              </div>
            </div>

            <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-4">
              <p className="text-zinc-300 leading-relaxed">
                {form.getValues('description')}
              </p>
              <div className="flex flex-wrap gap-2">
                {form
                  .getValues('tags')
                  .split(',')
                  .map((tag, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="border-zinc-700 text-zinc-400"
                    >
                      #{tag.trim()}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">
                Créditos
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-zinc-500">Pedido por</p>
                  <p className="text-white font-medium">
                    {form.getValues('createdBy')}
                  </p>
                </div>
                <Separator className="bg-white/5" />
                <div>
                  <p className="text-xs text-zinc-500">Referencia</p>
                  <p className="text-yellow-500 text-xs truncate underline underline-offset-4 decoration-yellow-500/30">
                    {form.getValues('letterboxdUrl')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Movie Reel Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Film className="w-5 h-5 text-yellow-500" />
              Películas ({moviePreviews.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {moviePreviews.map((movie) => (
              <div key={movie.imdbId} className="group relative space-y-2">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/10">
                  <Image
                    src={movie.posterUrl}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-zinc-100 truncate leading-tight">
                    {movie.title}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {movie.originalTitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="bg-red-950/50 border border-red-500/20 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-medium text-sm">Error</h3>
            </div>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <footer className="sticky bottom-6 flex gap-4 bg-zinc-950 p-4 rounded-xl border border-white/10">
          <Button
            variant="ghost"
            onClick={() => {
              setIsPreview(false);
              setError(null);
            }}
            disabled={isSubmitting}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a editar
          </Button>
          <Button
            className="flex-1 bg-white text-black hover:bg-yellow-500 font-semibold"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Publicar lista
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </footer>
      </div>
    );
  }

  // --- FORM STATE ---
  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePreview();
        }}
        className="max-w-4xl mx-auto space-y-12 pb-20"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Crear lista
            </h2>
            <p className="text-zinc-500 text-sm">
              Ingresá los detalles y los IDs de IMDB de las películas.
            </p>
          </div>
          {error && (
            <div className="bg-red-950/50 border border-red-500/20 rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-medium text-sm">Error</h3>
              </div>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-900 p-6 md:p-8 rounded-xl border border-white/10">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-zinc-400">
                    Título de la lista
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Noir de los 40s"
                      className="bg-zinc-950 border-white/10 h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-zinc-400">
                    Descripción
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cuéntanos de qué trata esta selección..."
                      className="bg-zinc-950 border-white/10 min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="imgUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-zinc-400">
                    Poster principal (URL)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://..."
                      className="bg-zinc-950 border-white/10 h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Imagen de cabecera para la lista.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="createdBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-zinc-400">
                    Solicitado por
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del socio"
                      className="bg-zinc-950 border-white/10 h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Section 2: Metadata & Movies */}
        <div className="space-y-8 p-6 md:p-8 rounded-xl border border-white/10 bg-zinc-900">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-zinc-400 flex items-center gap-2">
                    <Tag className="w-3 h-3" /> Etiquetas
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="terror, slasher, 80s"
                      className="bg-zinc-950 border-white/10 h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="letterboxdUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm text-zinc-400 flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" /> Letterboxd Reference
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://letterboxd.com/..."
                      className="bg-zinc-950 border-white/10 h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="movies"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm text-zinc-400">
                  IDs de IMDB
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="tt1234567, tt7654321..."
                    className="bg-zinc-950 border-white/10 h-40 font-mono text-xs tracking-wider p-4"
                  />
                </FormControl>
                <FormDescription className="text-[10px]">
                  Separa los IDs por comas.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <Button
            type="button"
            variant="ghost"
            className="text-zinc-500 hover:text-white"
            onClick={() => router.push('/lists')}
          >
            Descartar
          </Button>
          <Button
            type="submit"
            className="bg-yellow-500 text-black font-semibold px-8 h-11 hover:bg-yellow-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-black" />
            ) : (
              <>
                Vista previa
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
