'use client';

import * as React from 'react';
import { Calendar, Info, NotebookTabs, Clipboard, Film } from 'lucide-react';

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
import type { SafeUser } from '@/lib/auth';
import { NavUser } from './nav-user';
import { NavMain } from './nav-main';

// This is sample data.
const navItems = [
  {
    title: 'Listas',
    url: '/lists',
    icon: NotebookTabs,
  },
  // {
  //   title: 'Calendario',
  //   url: '/calendar',
  //   icon: Calendar,
  // },
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
}: React.ComponentProps<typeof Sidebar> & { user: SafeUser }) {
  const { open } = useSidebar();

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
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
