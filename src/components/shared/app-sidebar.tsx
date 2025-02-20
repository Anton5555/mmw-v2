'use client';

import * as React from 'react';
import { Calendar, Info, NotebookTabs } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { NavUser } from './nav-user';
import { NavMain } from './nav-main';
import { User } from 'better-auth';

// This is sample data.
const navItems = [
  {
    title: 'Listas',
    url: '/lists',
    icon: NotebookTabs,
  },
  {
    title: 'Calendario',
    url: '/calendar',
    icon: Calendar,
  },
  // {
  //   title: 'MAM',
  //   url: '/mam',
  //   icon: Film,
  // },
  // {
  //   title: 'Padlet',
  //   url: '/padlet',
  //   icon: Clipboard,
  // },
  {
    title: 'Sobre la app',
    url: '/about',
    icon: Info,
  },
];

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: User }) {
  const { open, setOpenMobile } = useSidebar();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Image
          src="/logo.png"
          alt={'Míralos Morir V2 logo'}
          className={cn(open ? 'block' : 'hidden')}
          width={890}
          height={167}
        />
      </SidebarHeader>

      <SidebarContent className="p-2">
        <NavMain items={navItems} onNavigate={() => setOpenMobile(false)} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
