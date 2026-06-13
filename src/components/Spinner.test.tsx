import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('exposes a status role with a default accessible label', () => {
    render(<Spinner />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAccessibleName('로딩 중');
  });

  it('uses a custom label when provided', () => {
    render(<Spinner label="변환 중" />);
    expect(screen.getByRole('status')).toHaveAccessibleName('변환 중');
  });

  it('merges a passthrough className for sizing', () => {
    render(<Spinner className="size-6" />);
    expect(screen.getByRole('status').className).toContain('size-6');
  });
});
