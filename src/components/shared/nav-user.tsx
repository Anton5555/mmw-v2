'use client';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { signOut } from '@/lib/auth-client';
import { ChevronsUpDown, LogOut, User as UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'better-auth';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import ProfileForm from '../profile-form';

export function NavUser({ user }: { user: User }) {
  const { state } = useSidebar();
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

      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="h-14 rounded-xl border border-white/5 bg-zinc-900/50 hover:bg-zinc-900 transition-all shadow-xl"
              >
                <Avatar className="h-9 w-9 rounded-lg border border-white/10 ring-2 ring-black">
                  <AvatarImage src={user.image ?? undefined} alt={user.name} />
                  <AvatarFallback className="bg-zinc-800 text-xs">
                    {user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {state === 'expanded' && (
                  <div className="ml-2 flex flex-1 flex-col items-start leading-tight">
                    <span className="truncate text-sm font-bold text-zinc-100">
                      {user.name}
                    </span>
                    <span className="truncate text-[10px] text-zinc-500 uppercase tracking-tighter">
                      Socio Premium
                    </span>
                  </div>
                )}
                <ChevronsUpDown className="ml-auto h-4 w-4 text-zinc-600" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 rounded-xl bg-zinc-950 border-white/10 shadow-2xl p-2"
              side={state === 'collapsed' ? 'right' : 'top'}
              align="end"
              sideOffset={12}
            >
              {/* Dropdown content styled like a cinema menu */}
              <DropdownMenuLabel className="font-normal px-2 py-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold leading-none text-white">
                    {user.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="rounded-lg focus:bg-white/10"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Cuenta y Perfil
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem
                className="rounded-lg text-red-400 focus:bg-red-500/10 focus:text-red-400"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Salir del Cine
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
