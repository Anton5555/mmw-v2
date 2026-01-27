import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CreateListForm } from './_components/create-list-form';

// Increase timeout for list creation with many movies
// This allows the server action to run longer (up to 5 minutes on Vercel Pro)
export const maxDuration = 300; // 5 minutes

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
        <CreateListForm />
      </div>
    </div>
  );
}
