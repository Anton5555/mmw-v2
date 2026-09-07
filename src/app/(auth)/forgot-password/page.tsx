'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/lib/validations/auth';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { forgetPassword } from '@/lib/auth-client';

export default function ForgotPassword() {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      await forgetPassword({
        email: data.email,
        redirectTo: '/reset-password',
      });
      toast.success(
        'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
      );
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Error al enviar el email. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      <div className="p-8 pb-2 space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Restablecer contraseña
        </h1>
        <p className="text-sm text-zinc-400">
          Te enviamos un email con instrucciones
        </p>
      </div>

      <div className="p-8 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm text-zinc-400">Email</FormLabel>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                    <FormControl>
                      <Input
                        placeholder="m@example.com"
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
                'Enviar instrucciones'
              )}
            </Button>

            <p className="text-center text-sm text-zinc-500 pt-2">
              ¿Recordaste tu contraseña?{' '}
              <Link
                href="/sign-in"
                className="text-white hover:text-yellow-500 transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
