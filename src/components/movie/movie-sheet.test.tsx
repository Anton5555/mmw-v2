// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const back = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ back }) }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

import { MovieSheet } from './movie-sheet';

beforeEach(() => {
  back.mockReset();
});

describe('MovieSheet', () => {
  it('renders the title, content and a full-page link', () => {
    render(
      <MovieSheet title="A Second Chance" fullPageHref="/mam/movie/7">
        <p>contenido</p>
      </MovieSheet>
    );

    expect(screen.getByText('A Second Chance')).toBeTruthy();
    expect(screen.getByText('contenido')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Abrir página completa/ }).getAttribute('href')
    ).toBe('/mam/movie/7');
  });

  it('goes back when closed', async () => {
    render(
      <MovieSheet title="A Second Chance" fullPageHref="/mam/movie/7">
        <p>contenido</p>
      </MovieSheet>
    );

    await userEvent.keyboard('{Escape}');

    expect(back).toHaveBeenCalledTimes(1);
  });
});
