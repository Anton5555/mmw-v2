'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User as UserIcon,
  Loader2,
  Camera,
  Save,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfileFormValues, profileFormSchema } from '@/lib/validations/users';
import { toast } from 'sonner';
import { updateUserAction } from '@/lib/actions/users/update-user';
import { User } from 'better-auth';
import { useWatch } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface ProfileFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export default function ProfileForm({
  open,
  onOpenChange,
  user,
}: ProfileFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(
    user?.image || null
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      image: user?.image ?? null,
    },
  });

  // Watch name for live preview
  const watchedName = useWatch({
    control: form.control,
    name: 'name',
  });

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: { onChange: (value: File | string | null) => void }
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no puede ser mayor a 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('El archivo debe ser una imagen');
        return;
      }

      field.onChange(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateUserAction(data);
      toast.success('Perfil actualizado correctamente');
      onOpenChange(false);
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Error al actualizar el perfil');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-zinc-950 border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row min-h-[450px]">
          {/* LEFT PANEL: The "Studio Pass" Preview */}
          <div className="w-full md:w-5/12 bg-zinc-900/50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
            <div className="relative group">
              <Avatar className="h-32 w-32 rounded-2xl border-2 border-white/10 shadow-2xl ring-offset-4 ring-offset-zinc-950 ring-2 ring-yellow-500/20">
                <AvatarImage
                  src={imagePreview ?? undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl bg-zinc-800 text-zinc-400">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <label
                htmlFor="image-upload"
                className="absolute -bottom-2 -right-2 p-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl cursor-pointer shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <Camera className="w-4 h-4" />
              </label>
            </div>

            <div className="mt-6 text-center space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-white">
                {watchedName || 'Sin Nombre'}
              </h3>
              <div className="flex items-center justify-center gap-1.5 text-zinc-500">
                <Mail className="w-3 h-3" />
                <span className="text-xs font-mono">{user.email}</span>
              </div>
            </div>

            <div className="mt-8 w-full">
              <div className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    {(user as User & { role?: string | null })?.role === 'ADMIN'
                      ? 'Admin'
                      : 'MAM Member'}
                  </span>
                  <ShieldCheck
                    className={cn(
                      'w-4 h-4',
                      (user as User & { role?: string | null })?.role ===
                        'ADMIN'
                        ? 'text-yellow-500'
                        : 'text-yellow-500/50'
                    )}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: The Form Editor */}
          <div className="flex-1 p-8">
            <DialogHeader className="mb-8">
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">
                Editar Perfil
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Ajusta tu información de identidad en la plataforma.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Image Hidden Input (Triggered by label above) */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleImageChange(e, field)}
                    />
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        Nombre de Usuario
                      </FormLabel>
                      <div className="relative group">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                        <FormControl>
                          <Input
                            placeholder="Tu nombre"
                            className="pl-10 bg-zinc-900/50 border-white/10 h-11 focus:border-yellow-500 transition-all"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <div className="space-y-1.5">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-zinc-500 opacity-50">
                    Email Personal
                  </FormLabel>
                  <Input
                    value={user.email}
                    disabled
                    className="bg-zinc-950 border-white/5 text-zinc-700 h-11 cursor-not-allowed italic"
                  />
                  <p className="text-[9px] text-zinc-600">
                    El correo electrónico está vinculado a tu cuenta y no puede
                    cambiarse.
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 text-zinc-500 hover:text-white hover:bg-white/5"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-2 bg-white text-black hover:bg-zinc-200 font-bold px-8 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all"
                    disabled={form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
