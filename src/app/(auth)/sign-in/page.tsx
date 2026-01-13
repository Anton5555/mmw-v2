'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl font-bold text-center">
          Bienvenido de nuevo
        </CardTitle>
        <CardDescription className="text-center">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <FormControl>
                        <Input
                          placeholder="m@example.com"
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
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Contraseña</FormLabel>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        Olvidaste tu contraseña?
                      </Link>
                    </div>
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
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <Label
                      htmlFor="rememberMe"
                      className="text-sm text-muted-foreground"
                    >
                      Recordame
                    </Label>
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
                  'Iniciar sesión'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                No tenés una cuenta?{' '}
                <Link
                  href="/sign-up"
                  className="underline hover:text-foreground"
                >
                  Creala ahora
                </Link>
              </p>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
