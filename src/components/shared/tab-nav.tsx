import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TabNavItem = {
  href: string;
  label: string;
  active: boolean;
};

/**
 * Underlined tab row for switching views inside one section. Same marker as
 * the top bar (yellow rule under the active item), scrolls sideways on phones, with a fade on the right edge so hidden tabs read as scrollable.
 */
export function TabNav({
  items,
  label,
  trailing,
  className,
}: {
  items: TabNavItem[];
  label: string;
  /** Extra links pinned to the right, e.g. admin-only tools. */
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'no-scrollbar flex items-stretch gap-1 overflow-x-auto border-b border-border max-sm:pr-6 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)]',
        className
      )}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            'flex shrink-0 items-center whitespace-nowrap px-3 py-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
            item.active
              ? 'font-semibold text-foreground shadow-[inset_0_-3px_0_hsl(var(--primary))]'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}
      {trailing && (
        <div className="ml-auto flex shrink-0 items-stretch gap-1 pl-4">
          {trailing}
        </div>
      )}
    </nav>
  );
}
