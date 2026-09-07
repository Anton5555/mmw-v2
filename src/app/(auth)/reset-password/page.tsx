'use client';

import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordFormValues } from '@/lib/validations/auth';
import { resetPasswordSchema } from '@/lib/validations/auth';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { resetPassword } from '@/lib/auth-client';
import { useEffect, Suspense } from 'react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get('token');
  const error = searchParams.get('error');

  useEffect(() => {
    if (error === 'invalid_token' || !token) {
      const timer = setTimeout(() => {
        toast.error('El token es inválido o ha expirado');
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [error, token]);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      passwordConfirmation: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await resetPassword({
        newPassword: data.password,
        token: token || '',
        fetchOptions: {
          onSuccess: () => {
            toast.success('Contraseña restablecida correctamente');
            router.push('/sign-in');
          },
          onError: (ctx) => {
            if (ctx.error.message.toLowerCase().includes('invalid token')) {
              toast.error('El token es inválido o ha expirado');
            } else {
              toast.error(
                'Error al restablecer la contraseña. Por favor intenta de nuevo.'
              );
            }
          },
        },
      });
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error(
        'Error al restablecer la contraseña. Por favor intenta de nuevo.'
      );
    }
  };

  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      <div className="p-8 pb-2 space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Nueva contraseña
        </h1>
        <p className="text-sm text-zinc-400">Elegí una contraseña nueva</p>
      </div>

      <div className="p-8 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm text-zinc-400">
                      Contraseña
                    </FormLabel>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-11 pl-10 bg-zinc-950 border-white/10 rounded-lg focus-visible:ring-1 focus-visible:ring-yellow-500"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordConfirmation"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm text-zinc-400">
                      Confirmar contraseña
                    </FormLabel>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-11 pl-10 bg-zinc-950 border-white/10 rounded-lg focus-visible:ring-1 focus-visible:ring-yellow-500"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-white hover:bg-yellow-500 text-black font-semibold rounded-lg"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Restablecer contraseña'
                )}
              </Button>

              <p className="text-center text-sm text-zinc-500 pt-2">
                ¿Recordaste tu contraseña?{' '}
                <Link
                  href="/sign-in"
                  className="text-white hover:text-yellow-500 transition-colors"
                >
                  Iniciá sesión
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="text-zinc-400 text-sm">Cargando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
