'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Loader2 } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useState } from 'react';
import { ProfileFormValues, profileFormSchema } from '@/lib/validations/users';
import { updateUserAction } from '@/lib/actions/update-user';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';

interface ProfileFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileForm({ open, onOpenChange }: ProfileFormProps) {
  const { data: session } = useSession();

  const [imagePreview, setImagePreview] = useState<string | null>(
    session?.user?.image || null
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
      image: session?.user?.image ?? null,
    },
  });

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: { onChange: (value: File | null) => void }
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      field.onChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const result = await updateUserAction(data);

      if (result?.data && !('error' in result.data)) {
        toast.success('Perfil actualizado correctamente');
        onOpenChange(false);
      } else {
        toast.error('Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Error al actualizar el perfil');
    }
  };

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <FormControl>
                      <Input className="pl-10" {...field} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Foto de perfil</FormLabel>
                  <div className="flex items-center gap-4">
                    {imagePreview && (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden">
                        <Image
                          src={imagePreview}
                          alt="Profile preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, field)}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
