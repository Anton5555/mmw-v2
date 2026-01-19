'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, Lock, User, KeyRound } from 'lucide-react';
import { signUp } from '@/lib/auth-client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type SignUpFormValues, signUpSchema } from '@/lib/validations/auth';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface SignUpFormProps {
  validateVipCode: (code: string) => Promise<boolean>;
}

export default function SignUpForm({ validateVipCode }: SignUpFormProps) {
  const router = useRouter();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      vipCode: '',
    },
  });

  const onSubmit = async (data: SignUpFormValues) => {
    try {
      const isValidVipCode = await validateVipCode(data.vipCode);

      if (!isValidVipCode) {
        form.setError('vipCode', {
          message: 'El código VIP es incorrecto',
        });
        return;
      }

      await signUp.email({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`,
        callbackURL: '/home?verified=true',
        fetchOptions: {
          onSuccess: () => {
            toast.success(
              'Cuenta creada! Por favor verifica tu email para continuar.'
            );
            router.push('/sign-in');
          },
          onError: (ctx) => {
            if (
              ctx.error.message.toLowerCase().includes('email already in use')
            ) {
              form.setError('email', {
                message: 'Este email ya está registrado',
              });
            } else {
              toast.error(ctx.error.message);
            }
          },
        },
      });
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('Error al crear la cuenta. Por favor intenta de nuevo.');
    }
  };

  return (
    <div className="border border-white/10 bg-zinc-900/40 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-2xl w-full">
      <div className="p-8 pb-4 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500 text-center">
          Acceso VIP
        </p>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white text-center">
          Crear Cuenta
        </h1>
      </div>

      <div className="p-8 pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Nombre
                      </FormLabel>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                        <FormControl>
                          <Input
                            placeholder="Max"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        Apellido
                      </FormLabel>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-yellow-500 transition-colors" />
                        <FormControl>
                          <Input
                            placeholder="Robinson"
                            className="h-12 pl-12 bg-white/5 border-white/5 rounded-xl focus-visible:ring-1 focus-visible:ring-yellow-500 transition-all placeholder:text-zinc-700"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-[10px] font-bold text-red-500 uppercase" />
                    </FormItem>
                  )}
                />
              </div>

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
                          type="email"
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

              <FormField
                control={form.control}
                name="vipCode"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-yellow-500">
                      Código VIP
                    </FormLabel>
                    <div className="relative group bg-yellow-500/5 rounded-xl p-0.5 border-2 border-yellow-500/20">
                      <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500/70 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Ingresa el código VIP"
                          className="h-12 pl-12 bg-white/5 border-yellow-500/30 rounded-lg focus-visible:ring-2 focus-visible:ring-yellow-500 transition-all placeholder:text-zinc-700"
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
                    Crear Cuenta
                  </span>
                )}
              </Button>

              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-zinc-600 pt-4">
                ¿Ya tenés una cuenta?{' '}
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
