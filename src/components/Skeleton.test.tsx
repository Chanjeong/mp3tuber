import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders a decorative placeholder hidden from assistive tech', () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId('sk')).toHaveAttribute('aria-hidden', 'true');
  });

  it('merges a passthrough className for sizing', () => {
    render(<Skeleton data-testid="sk" className="h-9 w-full" />);
    const el = screen.getByTestId('sk');
    expect(el.className).toContain('h-9');
    expect(el.className).toContain('w-full');
  });
});
