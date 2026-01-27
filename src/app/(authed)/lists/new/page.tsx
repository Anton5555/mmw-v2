import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CreateListForm } from './_components/create-list-form';

// Increase timeout for list creation with many movies
// Maximum allowed for Vercel Hobby plan is 60 seconds
export const maxDuration = 60; // 60 seconds (max for Hobby plan)

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
