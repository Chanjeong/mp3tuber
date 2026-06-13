import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBanner } from './ErrorBanner';

describe('ErrorBanner', () => {
  it('shows the message in an alert', () => {
    render(<ErrorBanner message="검색에 실패했습니다." />);
    expect(screen.getByRole('alert')).toHaveTextContent('검색에 실패했습니다.');
  });

  it('renders a retry button only when onRetry is provided', () => {
    const { rerender } = render(<ErrorBanner message="x" />);
    expect(screen.queryByRole('button', { name: /다시 시도/ })).not.toBeInTheDocument();

    rerender(<ErrorBanner message="x" onRetry={vi.fn()} />);
    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
  });

  it('invokes onRetry when the retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorBanner message="x" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: /다시 시도/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
