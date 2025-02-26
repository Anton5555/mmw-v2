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
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  CreateListFormValues,
  createListFormSchema,
} from '@/lib/validations/lists';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { createListAction } from '@/lib/actions/lists/create-list';
import {
  previewMoviesAction,
  type MoviePreview,
} from '@/lib/actions/lists/preview-list';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

export function CreateListForm() {
  const router = useRouter();
  const [isPreview, setIsPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moviePreviews, setMoviePreviews] = useState<MoviePreview[]>([]);

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
    try {
      const formData = form.getValues();
      const movieIds = formData.movies.split(',').map((id) => id.trim());

      const previews = await previewMoviesAction(movieIds);
      setMoviePreviews(previews);
      setIsPreview(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al obtener la vista previa'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CreateListFormValues) => {
    setIsSubmitting(true);
    try {
      await createListAction(data);
      toast.success('Lista creada correctamente');
      router.push('/lists');
    } catch (error) {
      console.error('List creation error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al crear la lista'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isPreview) {
    return (
      <div className="space-y-8">
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-xl font-bold">{form.getValues('name')}</h2>
          <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-lg">
            <Image
              src={form.getValues('imgUrl')}
              alt="List preview"
              fill
              className="object-cover"
            />
          </div>
          <p className="mb-2 text-muted-foreground">
            {form.getValues('description')}
          </p>
          <p className="text-sm text-muted-foreground">
            Tags: {form.getValues('tags')}
          </p>
          <p className="text-sm text-muted-foreground">
            A pedido de: {form.getValues('createdBy')}
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold">Películas a agregar:</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {moviePreviews.map((movie) => (
              <div key={movie.imdbId} className="space-y-2">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
                  <Image
                    src={movie.posterUrl}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <p className="text-sm font-medium">{movie.title}</p>
                {movie.originalTitle !== movie.title && (
                  <p className="text-xs text-muted-foreground">
                    {movie.originalTitle}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsPreview(false)}
            disabled={isSubmitting}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a editar
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando lista...
              </>
            ) : (
              'Confirmar y crear lista'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handlePreview();
        }}
        className="space-y-6"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la lista</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea {...field} />
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
              <FormLabel>URL de Letterboxd</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="https://letterboxd.com/list/..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imgUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la imagen</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input {...field} placeholder="drama, acción, comedia..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="createdBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>¿Quien solicitó la lista?</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="movies"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IDs de IMDB</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="tt1234567, tt7654321..."
                  className="h-40"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/lists')}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
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
