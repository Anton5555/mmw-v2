import { AppSidebar } from '@/components/app-sidebar';
import { BreadcrumbsNav } from '@/components/breadcrumbs-nav';
import { BreadcrumbProvider } from '@/lib/contexts/breadcrumb-context';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return redirect('/sign-in');
  }

  const user = session?.user;

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          ...user,
          image: user.image ?? null,
        }}
      />

      <SidebarInset>
        <BreadcrumbProvider>
          <BreadcrumbsNav />
          {children}
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
