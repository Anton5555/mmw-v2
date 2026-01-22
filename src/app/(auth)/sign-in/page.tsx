'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Mail, Lock } from 'lucide-react';
import { signIn } from '@/lib/auth-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { signInSchema } from '@/lib/validations/auth';

export default function SignIn() {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof signInSchema>) => {
    try {
      await signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
        callbackURL: '/home',
        fetchOptions: {
          onSuccess: () => {
            router.push('/home');
          },
          onError: (ctx) => {
            if (ctx.error.status === 403) {
              toast.error('Por favor verifica tu email');
            } else if (ctx.error.status === 401) {
              toast.error('Credenciales incorrectas');
            } else {
              toast.error(ctx.error.message);
            }
          },
        },
      });
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Error al iniciar sesión. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="border border-white/10 bg-zinc-900/40 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl w-full">
      <div className="p-8 pb-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 text-center">
          Acceso Exclusivo
        </p>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center">
          Bienvenido
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Contraseña
                      </FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-[10px] font-black uppercase text-zinc-600 hover:text-white transition-colors"
                      >
                        ¿Olvidaste?
                      </Link>
                    </div>
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
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0 py-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/20 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                      />
                    </FormControl>
                    <Label className="text-[11px] font-bold uppercase tracking-tighter text-zinc-500 cursor-pointer">
                      Recordame en esta sesión
                    </Label>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-14 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-xl group"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                <span className="group-hover:scale-105 transition-transform">
                  Entrar
                </span>
              )}
            </Button>

            <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 pt-4">
              ¿No tenés cuenta?{' '}
              <Link
                href="/sign-up"
                className="text-white hover:text-yellow-500 underline decoration-white/20 underline-offset-4 transition-colors"
              >
                Creala ahora
              </Link>
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
