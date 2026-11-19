'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { User } from 'better-auth';
import { signOut } from '@/lib/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ProfileForm from '../profile-form';

export function NavUser({ user }: { user: User }) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/');
        },
      },
    });
  };

  return (
    <>
      <ProfileForm
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        user={user}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Cuenta"
          className="flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-primary"
        >
          <Avatar className="size-9 rounded-sm">
            <AvatarImage src={user.image ?? undefined} alt={user.name} />
            <AvatarFallback className="rounded-sm bg-secondary text-xs font-semibold">
              {user.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-64 border-border bg-popover p-2"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuLabel className="px-2 py-3 font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{user.name}</p>
              <p className="truncate text-xs leading-normal text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
              <UserIcon className="mr-2 h-4 w-4" />
              Cuenta y perfil
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
