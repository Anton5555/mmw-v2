'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import type { User } from 'better-auth';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { BOARD_ENABLED } from '@/lib/config/features';
import { NavUser } from './nav-user';

const navItems = [
  { title: 'Listas', url: '/lists' },
  { title: 'Calendario', url: '/calendar' },
  ...(BOARD_ENABLED ? [{ title: 'Tablero', url: '/board' }] : []),
  { title: 'MAM', url: '/mam' },
  { title: 'IMDB LTA', url: '/imdb-lta' },
  { title: 'Top del Año', url: '/year-tops' },
  { title: 'Oscalos', url: '/oscars' },
];

const aboutItem = { title: 'Sobre la app', url: '/about' };

function isActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function TopNav({ user }: { user: User }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const desktopLink = (item: { title: string; url: string }) => {
    const active = isActive(pathname, item.url);
    return (
      <Link
        key={item.url}
        href={item.url}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-full items-center px-4 text-[15px] transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
          active
            ? 'font-semibold text-foreground shadow-[inset_0_-4px_0_hsl(var(--primary))]'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {item.title}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[#0a181b] pt-[env(safe-area-inset-top,0px)]">
      <nav aria-label="Principal" className="flex h-14 items-stretch">
        <Link
          href="/home"
          aria-label="MMW, ir al inicio"
          className="flex items-center bg-[#d8392b] px-5 font-display text-[28px] font-extrabold leading-none tracking-wide text-[#f1e9d8] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        >
          MMW
        </Link>

        <div className="hidden h-full items-stretch lg:flex">
          {navItems.map(desktopLink)}
        </div>

        <div className="ml-auto hidden h-full items-stretch lg:flex">
          {desktopLink(aboutItem)}
        </div>

        <div className="ml-auto flex items-center gap-1 pr-2 lg:ml-0 lg:pl-2">
          <NavUser user={user} />

          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              aria-label="Abrir menú"
              className="flex size-11 items-center justify-center text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-primary lg:hidden"
            >
              <Menu className="size-6" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-border bg-background p-0">
              <SheetTitle className="flex h-14 items-center bg-[#d8392b] px-5 font-display text-[28px] font-extrabold tracking-wide text-[#f1e9d8]">
                MMW
              </SheetTitle>
              <SheetDescription className="sr-only">
                Navegación principal
              </SheetDescription>
              <div className="flex flex-col py-2">
                {[...navItems, aboutItem].map((item) => {
                  const active = isActive(pathname, item.url);
                  return (
                    <Link
                      key={item.url}
                      href={item.url}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'px-5 py-3 text-base',
                        active
                          ? 'bg-accent font-semibold text-foreground shadow-[inset_4px_0_0_hsl(var(--primary))]'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
