import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CreateListForm } from './_components/create-list-form';

export default async function NewListPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user.role !== 'admin') {
    redirect('/lists');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Crear nueva lista</h1>
          <p className="mt-2 text-muted-foreground">
            Ingresa los detalles de la lista y los IDs de IMDB de las películas.
          </p>
        </div>

        <CreateListForm />
      </div>
    </div>
  );
}
