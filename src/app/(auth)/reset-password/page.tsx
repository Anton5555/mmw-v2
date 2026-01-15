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
    <div className="border border-white/10 bg-zinc-900/40 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl w-full">
      <div className="p-8 pb-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 text-center">
          Nueva Contraseña
        </p>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center">
          Restablecer
        </h1>
      </div>

      <div className="p-8 pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Contraseña
                    </FormLabel>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-12 pl-12 bg-white/5 border-white/5 rounded-xl focus-visible:ring-1 focus-visible:ring-yellow-500 transition-all placeholder:text-zinc-700"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-[10px] font-bold text-red-500 uppercase" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordConfirmation"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Confirmar Contraseña
                    </FormLabel>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-12 pl-12 bg-white/5 border-white/5 rounded-xl focus-visible:ring-1 focus-visible:ring-yellow-500 transition-all placeholder:text-zinc-700"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-[10px] font-bold text-red-500 uppercase" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-14 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl group"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <span className="group-hover:scale-105 transition-transform">
                    Restablecer Contraseña
                  </span>
                )}
              </Button>

              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 pt-4">
                ¿Recordaste tu contraseña?{' '}
                <Link
                  href="/sign-in"
                  className="text-white hover:text-yellow-500 underline decoration-white/20 underline-offset-4 transition-colors"
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
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
