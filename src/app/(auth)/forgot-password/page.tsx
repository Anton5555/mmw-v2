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
    <div className="border border-white/10 bg-zinc-900/40 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl w-full">
      <div className="p-8 pb-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 text-center">
          Recuperación
        </p>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center">
          Restablecer Contraseña
        </h1>
      </div>

      <div className="p-8 pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Email
                    </FormLabel>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          placeholder="m@example.com"
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
                    Enviar Instrucciones
                  </span>
                )}
              </Button>

              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 pt-4">
                ¿Recordaste tu contraseña?{' '}
                <Link
                  href="/sign-in"
                  className="text-white hover:text-yellow-500 underline decoration-white/20 underline-offset-4 transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
