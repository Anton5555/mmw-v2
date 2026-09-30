import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { CreateListForm } from './_components/create-list-form';
import { getCurrentSession } from '@/lib/get-session';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// Increase timeout for list creation with many movies
// Maximum allowed for Vercel Hobby plan is 60 seconds
export const maxDuration = 60; // 60 seconds (max for Hobby plan)

export default function NewListPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewListPageContent />
    </Suspense>
  );
}

async function NewListPageContent() {
  const session = await getCurrentSession();

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
