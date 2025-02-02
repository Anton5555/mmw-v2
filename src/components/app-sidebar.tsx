'use client';

import * as React from 'react';
import {
  Calendar,
  Frame,
  Info,
  Map,
  NotebookTabs,
  PieChart,
  Clipboard,
  Film,
} from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
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

// This is sample data.
const data = {
  user: {
    name: 'shadcn',
    email: 'm@example.com',
    avatar: '/avatars/shadcn.jpg',
  },
  navMain: [
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
    {
      title: 'MAM',
      url: '/mam',
      icon: Film,
    },
    {
      title: 'Padlet',
      url: '/padlet',
      icon: Clipboard,
    },
    {
      title: 'Sobre la app',
      url: '/about',
      icon: Info,
    },
  ],
  projects: [
    {
      name: 'Design Engineering',
      url: '#',
      icon: Frame,
    },
    {
      name: 'Sales & Marketing',
      url: '#',
      icon: PieChart,
    },
    {
      name: 'Travel',
      url: '#',
      icon: Map,
    },
  ],
};

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
        <NavMain items={data.navMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
