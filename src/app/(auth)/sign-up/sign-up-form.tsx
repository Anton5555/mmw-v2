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

  const fieldClass =
    'h-11 pl-10 bg-zinc-950 border-white/10 rounded-lg focus-visible:ring-1 focus-visible:ring-yellow-500';
  const labelClass = 'text-sm text-zinc-400';
  const messageClass = 'text-xs text-red-500';

  return (
    <div className="w-full rounded-xl border border-white/10 bg-zinc-900 overflow-hidden">
      <div className="p-8 pb-2 space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Crear cuenta
        </h1>
        <p className="text-sm text-zinc-400">Necesitás un código VIP</p>
      </div>

      <div className="p-8 pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className={labelClass}>Nombre</FormLabel>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                        <FormControl>
                          <Input
                            placeholder="Max"
                            className={fieldClass}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className={messageClass} />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className={labelClass}>Apellido</FormLabel>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                        <FormControl>
                          <Input
                            placeholder="Robinson"
                            className={fieldClass}
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className={messageClass} />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={labelClass}>Email</FormLabel>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          placeholder="m@example.com"
                          type="email"
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className={messageClass} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={labelClass}>Contraseña</FormLabel>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className={messageClass} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="passwordConfirmation"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={labelClass}>
                      Confirmar contraseña
                    </FormLabel>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className={fieldClass}
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className={messageClass} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vipCode"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm text-yellow-500">
                      Código VIP
                    </FormLabel>
                    <div className="relative group">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500/70 group-focus-within:text-yellow-500 transition-colors" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Ingresá el código VIP"
                          className="h-11 pl-10 bg-zinc-950 border-yellow-500/30 rounded-lg focus-visible:ring-1 focus-visible:ring-yellow-500"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className={messageClass} />
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
                  'Crear cuenta'
                )}
              </Button>

              <p className="text-center text-sm text-zinc-500 pt-2">
                ¿Ya tenés una cuenta?{' '}
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
