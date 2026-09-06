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
    <div className="w-full rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      <div className="p-8 pb-2 space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Bienvenido
        </h1>
        <p className="text-sm text-zinc-400">Iniciá sesión para continuar</p>
      </div>

      <div className="p-8 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm text-zinc-400">
                        Contraseña
                      </FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-zinc-500 hover:text-white transition-colors"
                      >
                        ¿Olvidaste?
                      </Link>
                    </div>
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
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 space-y-0 py-1">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-white/20 data-[state=checked]:bg-yellow-500 data-[state=checked]:text-black"
                      />
                    </FormControl>
                    <Label className="text-sm text-zinc-400 cursor-pointer">
                      Recordame en esta sesión
                    </Label>
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-white hover:bg-yellow-500 text-black font-semibold rounded-lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5" />
              ) : (
                'Entrar'
              )}
            </Button>

            <p className="text-center text-sm text-zinc-500 pt-2">
              ¿No tenés cuenta?{' '}
              <Link
                href="/sign-up"
                className="text-white hover:text-yellow-500 transition-colors"
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
