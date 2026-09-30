import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from './auth';

const validSignUp = {
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  password: 'supersecret',
  passwordConfirmation: 'supersecret',
  vipCode: 'code',
};

const issueFor = (result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }, field: string) =>
  result.error?.issues.find((i) => i.path.includes(field))?.message;

describe('signInSchema', () => {
  it('accepts valid credentials and defaults rememberMe to false', () => {
    expect(signInSchema.parse({ email: 'a@b.co', password: '12345678' }).rememberMe).toBe(false);
  });

  it('rejects malformed emails and short passwords', () => {
    const result = signInSchema.safeParse({ email: 'nope', password: 'short' });
    expect(result.success).toBe(false);
    expect(issueFor(result, 'email')).toBe('Ingresa un email válido');
    expect(issueFor(result, 'password')).toBe('La contraseña debe tener al menos 8 caracteres');
  });
});

describe('signUpSchema', () => {
  it('accepts a complete, matching form', () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it('reports mismatched passwords on passwordConfirmation', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, passwordConfirmation: 'different1' });
    expect(result.success).toBe(false);
    expect(issueFor(result, 'passwordConfirmation')).toBe('Las contraseñas no coinciden');
  });

  it.each(['firstName', 'lastName', 'vipCode'] as const)('requires %s', (field) => {
    expect(signUpSchema.safeParse({ ...validSignUp, [field]: '' }).success).toBe(false);
  });
});

describe('forgot/reset password schemas', () => {
  it('forgotPasswordSchema validates the email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'x' }).success).toBe(false);
  });

  it('resetPasswordSchema enforces length and confirmation', () => {
    expect(
      resetPasswordSchema.safeParse({ password: '12345678', passwordConfirmation: '12345678' }).success
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: '12345678', passwordConfirmation: '87654321' }).success
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ password: '123', passwordConfirmation: '123' }).success
    ).toBe(false);
  });
});
