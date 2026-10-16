// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  signInSocial: vi.fn(),
  push: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
  signUp: { email: mocks.signUpEmail },
  signIn: { social: mocks.signInSocial },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

import SignUpForm from './sign-up-form';

const fillForm = async (user: ReturnType<typeof userEvent.setup>, overrides: Record<string, string> = {}) => {
  const values = {
    Nombre: 'Ana',
    Apellido: 'Pérez',
    Email: 'ana@example.com',
    Contraseña: 'supersecret',
    'Confirmar contraseña': 'supersecret',
    'Código VIP': 'vip',
    ...overrides,
  };
  for (const [label, value] of Object.entries(values)) {
    const input = screen.getByLabelText(new RegExp(`^${label}$`));
    if (value) await user.type(input, value);
  }
};

const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('SignUpForm', () => {
  it('shows validation errors and does not call the server for an empty form', async () => {
    const verifyVipCode = vi.fn();
    const user = userEvent.setup();
    render(<SignUpForm verifyVipCode={verifyVipCode} />);

    await submit(user);

    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument();
    expect(screen.getByText('El apellido es requerido')).toBeInTheDocument();
    expect(verifyVipCode).not.toHaveBeenCalled();
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it('flags mismatched passwords', async () => {
    const user = userEvent.setup();
    render(<SignUpForm verifyVipCode={vi.fn()} />);

    await fillForm(user, { 'Confirmar contraseña': 'different1' });
    await submit(user);

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it('rejects a wrong VIP code without creating the account', async () => {
    const verifyVipCode = vi.fn().mockResolvedValue(false);
    const user = userEvent.setup();
    render(<SignUpForm verifyVipCode={verifyVipCode} />);

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('El código VIP es incorrecto')).toBeInTheDocument();
    expect(verifyVipCode).toHaveBeenCalledWith('vip');
    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it('creates the account with the full name and redirects to sign-in on success', async () => {
    mocks.signUpEmail.mockImplementation(async ({ fetchOptions }) => fetchOptions.onSuccess());
    const user = userEvent.setup();
    render(<SignUpForm verifyVipCode={vi.fn().mockResolvedValue(true)} />);

    await fillForm(user);
    await submit(user);

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/sign-in'));
    expect(mocks.signUpEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@example.com',
        password: 'supersecret',
        name: 'Ana Pérez',
        callbackURL: '/home?verified=true',
      })
    );
    expect(mocks.toastSuccess).toHaveBeenCalled();
  });

  it('maps an "email already in use" error onto the email field', async () => {
    mocks.signUpEmail.mockImplementation(async ({ fetchOptions }) =>
      fetchOptions.onError({ error: { message: 'Email already in use' } })
    );
    const user = userEvent.setup();
    render(<SignUpForm verifyVipCode={vi.fn().mockResolvedValue(true)} />);

    await fillForm(user);
    await submit(user);

    expect(await screen.findByText('Este email ya está registrado')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('toasts other server errors', async () => {
    mocks.signUpEmail.mockImplementation(async ({ fetchOptions }) =>
      fetchOptions.onError({ error: { message: 'Something broke' } })
    );
    const user = userEvent.setup();
    render(<SignUpForm verifyVipCode={vi.fn().mockResolvedValue(true)} />);

    await fillForm(user);
    await submit(user);

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Something broke'));
  });

  describe('Google sign-up', () => {
    const googleButton = () =>
      screen.getByRole('button', { name: 'Continuar con Google' });

    it('requires a VIP code before calling the server', async () => {
      const verifyVipCode = vi.fn();
      const user = userEvent.setup();
      render(<SignUpForm verifyVipCode={verifyVipCode} />);

      await user.click(googleButton());

      await waitFor(() => expect(verifyVipCode).not.toHaveBeenCalled());
      expect(mocks.signInSocial).not.toHaveBeenCalled();
    });

    it('shows an error and does not redirect with a wrong VIP code', async () => {
      const verifyVipCode = vi.fn().mockResolvedValue(false);
      const user = userEvent.setup();
      render(<SignUpForm verifyVipCode={verifyVipCode} />);

      await user.type(screen.getByLabelText(/^Código VIP$/), 'nope');
      await user.click(googleButton());

      expect(await screen.findByText('El código VIP es incorrecto')).toBeInTheDocument();
      expect(mocks.signInSocial).not.toHaveBeenCalled();
    });

    it('starts the Google flow with requestSignUp for a valid VIP code', async () => {
      const verifyVipCode = vi.fn().mockResolvedValue(true);
      const user = userEvent.setup();
      render(<SignUpForm verifyVipCode={verifyVipCode} />);

      await user.type(screen.getByLabelText(/^Código VIP$/), 'vip');
      await user.click(googleButton());

      await waitFor(() =>
        expect(mocks.signInSocial).toHaveBeenCalledWith(
          expect.objectContaining({ provider: 'google', requestSignUp: true })
        )
      );
      expect(verifyVipCode).toHaveBeenCalledWith('vip');
    });
  });

  it('shows a generic toast when the request throws', async () => {
    const user = userEvent.setup();
    render(<SignUpForm verifyVipCode={vi.fn().mockRejectedValue(new Error('down'))} />);

    await fillForm(user);
    await submit(user);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Error al crear la cuenta. Por favor intenta de nuevo.'
      )
    );
  });
});
