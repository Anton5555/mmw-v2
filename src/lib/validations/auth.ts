import * as z from 'zod';

export const signInSchema = z.object({
  email: z.email({ error: 'Ingresa un email válido' }),
  password: z
    .string()
    .min(1, { error: 'La contraseña es requerida' })
    .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' }),
  rememberMe: z.boolean().default(false),
});

export type SignInFormValues = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    firstName: z.string().min(1, { error: 'El nombre es requerido' }),
    lastName: z.string().min(1, { error: 'El apellido es requerido' }),
    email: z.email({ error: 'Ingresa un email válido' }),
    password: z
      .string()
      .min(1, { error: 'La contraseña es requerida' })
      .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' }),
    passwordConfirmation: z
      .string()
      .min(1, { error: 'La confirmación de contraseña es requerida' }),
    vipCode: z.string().min(1, { error: 'El código VIP es requerido' }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    error: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

export type SignUpFormValues = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email({ error: 'Ingresa un email válido' }),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, { error: 'La contraseña es requerida' })
      .min(8, { error: 'La contraseña debe tener al menos 8 caracteres' }),
    passwordConfirmation: z
      .string()
      .min(1, { error: 'La confirmación de contraseña es requerida' }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    error: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
