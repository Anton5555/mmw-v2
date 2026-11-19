import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { TopNav } from '@/components/shared/top-nav';
import { BreadcrumbsNav } from '@/components/shared/breadcrumbs-nav';
import { BreadcrumbProvider } from '@/lib/contexts/breadcrumb-context';
import { FilmSlateProvider } from '@/lib/contexts/film-slate-context';
import { getCurrentSession } from '@/lib/get-session';
import { FilmSlateWrapper } from '@/components/shared/film-slate-wrapper';
import { MovieSheetHost } from '@/components/movie/movie-sheet-host';
import { LoadingSpinner } from '@/components/shared/loading-spinner';

// Separate component to fetch user data (wrapped in Suspense)
async function AuthenticatedLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session?.user) {
    // The proxy only checks that a session cookie exists, so it can be stale
    redirect('/api/auth/clear-session');
  }

  const user = session.user;

  return (
    <div className="flex min-h-svh min-w-0 flex-col">
      <TopNav
        user={{
          ...user,
          image: user.image ?? null,
        }}
      />

      <div className="mb-8 min-w-0 flex-1">
        <BreadcrumbProvider>
          <FilmSlateProvider>
            <FilmSlateWrapper />
            <BreadcrumbsNav />
            {children}
            <MovieSheetHost />
          </FilmSlateProvider>
        </BreadcrumbProvider>
      </div>
    </div>
  );
}

const Layout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </Suspense>
  );
};

export default Layout;
