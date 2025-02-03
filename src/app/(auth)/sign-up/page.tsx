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
// import Image from 'next/image';
// import { useState } from 'react';
import { Loader2, Mail, Lock, User } from 'lucide-react';
// import { X } from 'lucide-react';
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

export default function SignUp() {
  const router = useRouter();
  // const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      passwordConfirmation: '',
      vipCode: '',
      // image: null,
    },
  });

  // const handleImageChange = async (
  //   e: React.ChangeEvent<HTMLInputElement>,
  //   field: { onChange: (value: File | null) => void }
  // ) => {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     field.onChange(file);
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       setImagePreview(reader.result as string);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  const onSubmit = async (data: SignUpFormValues) => {
    try {
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
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl font-bold text-center">
          Crear cuenta
        </CardTitle>

        <CardDescription className="text-center">
          Ingresa tus datos para crear una cuenta
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <FormControl>
                          <Input
                            placeholder="Max"
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
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <FormControl>
                          <Input
                            placeholder="Robinson"
                            className="pl-10"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                          type="email"
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

              <FormField
                control={form.control}
                name="vipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código VIP</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Ingresa el código VIP"
                          className="pl-10"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image upload field */}
              {/* <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto de perfil (opcional)</FormLabel>
                    <div className="flex items-end gap-4">
                      {imagePreview && (
                        <div className="relative w-16 h-16 rounded-sm overflow-hidden">
                          <Image
                            src={imagePreview}
                            alt="Profile preview"
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2 w-full">
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*"
                            className="w-full"
                            onChange={(e) => handleImageChange(e, field)}
                          />
                        </FormControl>
                        {imagePreview && (
                          <X
                            className="cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              field.onChange(null);
                              setImagePreview(null);
                            }}
                          />
                        )}
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  'Crear cuenta'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Ya tenés una cuenta?{' '}
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

// Image to base64 conversion utility
// async function convertImageToBase64(file: File): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onloadend = () => resolve(reader.result as string);
//     reader.onerror = reject;
//     reader.readAsDataURL(file);
//   });
// }
