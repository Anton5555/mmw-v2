'use client';

import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordFormValues } from '@/lib/validations/auth';
import { resetPasswordSchema } from '@/lib/validations/auth';
import { Card, CardTitle, CardHeader, CardContent } from '@/components/ui/card';
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl font-bold text-center">
          Restablecer contraseña
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordConfirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="pl-10"
                          {...field}
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
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Restablecer contraseña'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Recordaste tu contraseña?{' '}
                <Link
                  href="/sign-in"
                  className="underline hover:text-foreground"
                >
                  Iniciá sesión
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
