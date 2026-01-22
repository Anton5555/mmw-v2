'use client';

import { type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export function NavMain({
  items,
  onNavigate,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-2">
      {items.map((item) => {
        const isActive = pathname === item.url;

        return (
          <SidebarMenuItem key={item.title}>
            <Link href={item.url} onClick={onNavigate} className="cursor-pointer">
              <SidebarMenuButton
                tooltip={item.title}
                isActive={isActive}
                className={cn(
                  'relative h-11 transition-all duration-200 group cursor-pointer',
                  isActive
                    ? 'bg-white/5 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                )}
              >
                {/* Active Indicator Pillar */}
                {isActive && (
                  <div className="absolute left-0 h-5 w-1 rounded-r-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                )}

                {item.icon && (
                  <item.icon
                    className={cn(
                      'size-5 transition-transform group-hover:scale-110',
                      isActive ? 'text-yellow-500' : 'text-inherit'
                    )}
                  />
                )}
                <span className="text-sm tracking-tight">{item.title}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
