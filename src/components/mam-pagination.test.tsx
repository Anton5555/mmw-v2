// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setParams = vi.hoisted(() => vi.fn());
vi.mock('@/lib/hooks/useMamMoviesParams', () => ({
  useMamMoviesParams: () => ({ setParams }),
}));

import { MamPagination } from './mam-pagination';

const renderPagination = (props: Partial<React.ComponentProps<typeof MamPagination>> = {}) =>
  render(
    <MamPagination
      currentPage={3}
      totalPages={5}
      hasPrevPage
      hasNextPage
      {...props}
    />
  );

beforeEach(() => {
  setParams.mockReset();
});

describe('MamPagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = renderPagination({ totalPages: 1, hasPrevPage: false, hasNextPage: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the current page out of the total', () => {
    renderPagination();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('de 5')).toBeInTheDocument();
  });

  it('hides back buttons on the first page and forward buttons on the last', () => {
    const { rerender } = renderPagination({ currentPage: 1, hasPrevPage: false });
    expect(screen.queryByLabelText('Página anterior')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Primera página')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();

    rerender(<MamPagination currentPage={5} totalPages={5} hasPrevPage hasNextPage={false} />);
    expect(screen.queryByLabelText('Página siguiente')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
  });

  it('updates the page param when navigating', async () => {
    const user = userEvent.setup();
    renderPagination();

    await user.click(screen.getByLabelText('Página anterior'));
    expect(setParams).toHaveBeenLastCalledWith({ page: 2 });

    await user.click(screen.getByLabelText('Página siguiente'));
    expect(setParams).toHaveBeenLastCalledWith({ page: 4 });

    await user.click(screen.getByLabelText('Primera página'));
    expect(setParams).toHaveBeenLastCalledWith({ page: 1 });
  });
});
