'use client';

import * as React from 'react';
import { Calendar, ClipboardList, Film, Info, NotebookTabs, Trophy } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';

import Image from 'next/image';
import Link from 'next/link';
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
  {
    title: 'Tablero',
    url: '/board',
    icon: ClipboardList,
  },
  {
    title: 'MAM',
    url: '/mam',
    icon: Film,
  },
  {
    title: 'Top del Año',
    url: '/year-tops',
    icon: Trophy,
  },
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
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-white/5"
      {...props}
    >
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-white/5 bg-zinc-950/50">
        <Link
          href="/home"
          className="transition-transform duration-300 hover:scale-105"
        >
          {open ? (
            <Image
              src="/logo.png"
              alt={'Míralas Morir V2 logo'}
              className="brightness-110"
              width={140}
              height={40}
              priority
            />
          ) : (
            <Film className="h-6 w-6 text-zinc-400" />
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent
        className={cn('bg-zinc-950 py-6', open ? 'px-3' : 'px-2')}
      >
        {open && (
          <div className="mb-4 px-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Navegación
            </p>
          </div>
        )}
        <NavMain items={navItems} onNavigate={() => setOpenMobile(false)} />
      </SidebarContent>

      <SidebarFooter
        className={cn(
          'border-t border-white/5 bg-zinc-950/80',
          open ? 'p-4' : 'p-2'
        )}
      >
        <NavUser user={user} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
