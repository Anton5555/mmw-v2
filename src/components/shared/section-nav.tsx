import Link from 'next/link';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Segments stack icon-over-label on phones (like a native tab bar) so three
// of them fit at 375px without truncating, and sit inline from `sm` up.
export const sectionNavItemClassName =
  'flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 text-xs font-medium text-zinc-200 transition-[color,background-color,transform] duration-150 ease-out hover:bg-white/[0.06] hover:text-white active:scale-[0.97] focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-white/40 sm:h-10 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm [&_svg]:size-4 [&_svg]:shrink-0';

const COLUMNS = ['grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'];

/** One grouped control for a section's secondary destinations. */
export function SectionNav({
  items,
  className,
  ...props
}: ComponentProps<'nav'> & { items: number }) {
  return (
    <nav
      className={cn(
        'grid w-full rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:inline-flex sm:w-fit sm:self-start xl:self-auto',
        COLUMNS[items - 1],
        className
      )}
      {...props}
    />
  );
}

export function SectionNavLink({
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link className={cn(sectionNavItemClassName, className)} {...props} />
  );
}
