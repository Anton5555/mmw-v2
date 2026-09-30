// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

import { MovieSheet } from './movie-sheet';

const renderSheet = (onClose = vi.fn()) => {
  render(
    <MovieSheet
      open
      onClose={onClose}
      title="A Second Chance"
      fullPageHref="/mam/movie/7"
    >
      <p>contenido</p>
    </MovieSheet>
  );
  return onClose;
};

describe('MovieSheet', () => {
  it('renders the title, content and a full-page link', () => {
    renderSheet();

    expect(screen.getByText('A Second Chance')).toBeTruthy();
    expect(screen.getByText('contenido')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: /Abrir página completa/ })
        .getAttribute('href')
    ).toBe('/mam/movie/7');
  });

  it('calls onClose when dismissed', async () => {
    const onClose = renderSheet();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
