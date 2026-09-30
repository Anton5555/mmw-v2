// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OscarCategory } from '@/lib/validations/oscars';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  submitBallotAction: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
vi.mock('@/lib/actions/oscars/submit-ballot', () => ({
  submitBallotAction: mocks.submitBallotAction,
}));
vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
// Render motion elements as plain DOM so step changes are synchronous (no exit animations).
vi.mock('motion/react', async () => {
  const React = await import('react');
  const MOTION_PROPS = ['initial', 'animate', 'exit', 'transition'];
  const motion = new Proxy(
    {},
    {
      get: (_, tag: string) =>
        function MotionElement({ children, ...props }: Record<string, unknown>) {
          const domProps = Object.fromEntries(
            Object.entries(props).filter(([key]) => !MOTION_PROPS.includes(key))
          );
          return React.createElement(tag, domProps, children as React.ReactNode);
        },
    }
  );
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

import { OscarBallotForm } from './oscar-ballot-form';

const nominee = (id: number, name: string, filmTitle: string | null = null, posterUrl?: string) => ({
  id,
  name,
  filmTitle,
  imdbId: null,
  filmImdbId: null,
  movieId: posterUrl ? id : null,
  movie: posterUrl ? { id, title: name, posterUrl, imdbId: `tt${id}` } : null,
});

const categories: OscarCategory[] = [
  {
    id: 1,
    name: 'Best Picture',
    slug: 'best-picture',
    order: 1,
    winnerId: null,
    nominees: [nominee(11, 'Anora', null, 'https://img/anora.jpg'), nominee(12, 'Conclave')],
  },
  {
    id: 2,
    name: 'Best Actor',
    slug: 'best-actor',
    order: 2,
    winnerId: null,
    nominees: [
      nominee(21, 'Adrien Brody', 'The Brutalist'),
      nominee(22, 'Timothée Chalamet', 'A Complete Unknown'),
    ],
  },
  {
    id: 3,
    name: 'Best Original Song',
    slug: 'music-original-song',
    order: 3,
    winnerId: null,
    nominees: [nominee(31, 'El Mal', 'El Mal'), nominee(32, 'Like a Bird', 'Sing Sing')],
  },
];

const renderForm = (props: Partial<ComponentProps<typeof OscarBallotForm>> = {}) =>
  render(
    <OscarBallotForm categories={categories} editionId={7} ceremonyDate={null} {...props} />
  );

const pick = (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(screen.getByRole('button', { name }));
const click = (user: ReturnType<typeof userEvent.setup>, name: RegExp | string) =>
  user.click(screen.getByRole('button', { name }));

/** Select the first nominee of every category and land on the review step. */
async function reachReview(user: ReturnType<typeof userEvent.setup>) {
  await pick(user, /Anora/);
  await click(user, /Siguiente Categoría/);
  await pick(user, /Adrien Brody/);
  await click(user, /Siguiente Categoría/);
  await pick(user, /El Mal/);
  await click(user, /Ver Resumen/);
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OscarBallotForm — stepping through categories', () => {
  it('starts on the first category with navigation gated on a selection', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText('Categoría 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Best Picture' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anterior/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Siguiente Categoría/ })).toBeDisabled();

    await pick(user, /Anora/);
    expect(screen.getByRole('button', { name: /Siguiente Categoría/ })).toBeEnabled();
  });

  it('advances and goes back while keeping earlier selections', async () => {
    const user = userEvent.setup();
    renderForm();

    await pick(user, /Anora/);
    await click(user, /Siguiente Categoría/);
    expect(screen.getByText('Categoría 2 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente Categoría/ })).toBeDisabled();

    await click(user, /Anterior/);
    expect(screen.getByText('Categoría 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Siguiente Categoría/ })).toBeEnabled();
  });

  it('uses a poster grid for film categories and a text list otherwise', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole('img', { name: 'Anora' })).toHaveAttribute('src', 'https://img/anora.jpg');
    // Nominee without a poster falls back to its name, without an <img>.
    const conclave = screen.getByRole('button', { name: /Conclave/ });
    expect(conclave).toBeInTheDocument();
    expect(conclave.querySelector('img')).toBeNull();

    await pick(user, /Anora/);
    await click(user, /Siguiente Categoría/);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('The Brutalist')).toBeInTheDocument();
  });

  it('shows "Ver Resumen" on the last category', async () => {
    const user = userEvent.setup();
    renderForm();
    await pick(user, /Anora/);
    await click(user, /Siguiente Categoría/);
    await pick(user, /Adrien Brody/);
    await click(user, /Siguiente Categoría/);

    expect(screen.getByRole('button', { name: /Ver Resumen/ })).toBeDisabled();
    await pick(user, /El Mal/);
    expect(screen.getByRole('button', { name: /Ver Resumen/ })).toBeEnabled();
  });
});

describe('OscarBallotForm — review step', () => {
  it('lists every choice, hiding the film title when it repeats the nominee name', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachReview(user);

    expect(screen.getByText('Revisa tus selecciones')).toBeInTheDocument();
    expect(screen.getByText('Anora')).toBeInTheDocument();
    expect(screen.getByText('Adrien Brody')).toBeInTheDocument();
    expect(screen.getByText('• The Brutalist')).toBeInTheDocument();
    expect(screen.getByText('El Mal')).toBeInTheDocument();
    expect(screen.queryByText('• El Mal')).not.toBeInTheDocument();
  });

  it('goes back to the last category from review', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachReview(user);

    await click(user, /Anterior/);
    expect(screen.getByText('Categoría 3 de 3')).toBeInTheDocument();
  });

  it('lets the user edit a category and return straight to the review', async () => {
    const user = userEvent.setup();
    renderForm();
    await reachReview(user);

    await click(user, /Best Actor/);
    expect(screen.getByText('Categoría 2 de 3')).toBeInTheDocument();

    await pick(user, /Timothée Chalamet/);
    await click(user, /Volver al Resumen/);

    expect(screen.getByText('Revisa tus selecciones')).toBeInTheDocument();
    expect(screen.getByText('Timothée Chalamet')).toBeInTheDocument();
    expect(screen.queryByText('Adrien Brody')).not.toBeInTheDocument();
  });
});

describe('OscarBallotForm — submitting', () => {
  it('sends selections keyed by category id, then redirects to the summary', async () => {
    mocks.submitBallotAction.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm();
    await reachReview(user);

    await click(user, /Enviar Los Oscalos/);

    expect(mocks.submitBallotAction).toHaveBeenCalledWith({
      editionId: 7,
      selections: { '1': 11, '2': 21, '3': 31 },
    });
    expect(mocks.push).toHaveBeenCalledWith('/oscars?submitted=true');
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('toasts the server error message and does not redirect', async () => {
    mocks.submitBallotAction.mockRejectedValue(new Error('Ya enviaste tus apuestas'));
    const user = userEvent.setup();
    renderForm();
    await reachReview(user);

    await click(user, /Enviar Los Oscalos/);

    expect(mocks.toastError).toHaveBeenCalledWith('Ya enviaste tus apuestas');
    expect(mocks.push).not.toHaveBeenCalled();
    // The transition's pending state clears a tick after the error is handled.
    expect(
      await screen.findByRole('button', { name: /Enviar Los Oscalos/ }),
    ).toBeEnabled();
  });

  it('falls back to a generic message for non-Error rejections', async () => {
    mocks.submitBallotAction.mockRejectedValue('boom');
    const user = userEvent.setup();
    renderForm();
    await reachReview(user);

    await click(user, /Enviar Los Oscalos/);

    expect(mocks.toastError).toHaveBeenCalledWith('Error al enviar Los Oscalos');
  });
});

describe('OscarBallotForm — ceremony cutoff (3h before)', () => {
  const NOW = new Date('2026-03-01T12:00:00Z');
  const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    vi.setSystemTime(NOW);
  });

  it('shows no banner when the edition has no ceremony date', () => {
    renderForm({ ceremonyDate: null });
    expect(screen.queryByText(/se bloqueará en/)).not.toBeInTheDocument();
    expect(screen.queryByText('Formulario bloqueado')).not.toBeInTheDocument();
  });

  it('counts down to the cutoff, not the ceremony', () => {
    renderForm({ ceremonyDate: hoursFromNow(5.5) }); // cutoff is in 2h30m
    expect(screen.getByText('2 horas y 30 minutos')).toBeInTheDocument();
  });

  it('says "menos de un minuto" right before the cutoff', () => {
    renderForm({ ceremonyDate: new Date(hoursFromNow(3).getTime() + 30_000) });
    expect(screen.getByText('menos de un minuto')).toBeInTheDocument();
  });

  it('blocks the form once within 3 hours of the ceremony', async () => {
    const user = userEvent.setup();
    renderForm({ ceremonyDate: hoursFromNow(2) });

    expect(screen.getByRole('heading', { name: 'Formulario bloqueado' })).toBeInTheDocument();
    expect(screen.queryByText(/se bloqueará en/)).not.toBeInTheDocument();

    await reachReview(user);
    expect(screen.getByRole('button', { name: /Formulario bloqueado/ })).toBeDisabled();
    expect(mocks.submitBallotAction).not.toHaveBeenCalled();
  });
});
