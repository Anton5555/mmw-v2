import { Suspense } from 'react';
import { connection } from 'next/server';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { BreadcrumbsNav } from '@/components/shared/breadcrumbs-nav';
import { BreadcrumbProvider } from '@/lib/contexts/breadcrumb-context';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

// Separate component to fetch user data (wrapped in Suspense)
async function AuthenticatedLayoutContent({ children }: { children: React.ReactNode }) {
  await connection();
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    // This shouldn't happen due to proxy, but handle it gracefully
    return <div>Unauthorized</div>;
  }

  const user = session.user;

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          ...user,
          image: user.image ?? null,
        }}
      />

      <SidebarInset className="mb-8">
        <BreadcrumbProvider>
          <BreadcrumbsNav />
          {children}
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

const Layout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    }>
      <AuthenticatedLayoutContent>{children}</AuthenticatedLayoutContent>
    </Suspense>
  );
};

export default Layout;
