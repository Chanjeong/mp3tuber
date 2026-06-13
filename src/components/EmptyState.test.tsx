import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the default message', () => {
    render(<EmptyState />);
    expect(screen.getByText(/검색 결과가 없습니다/)).toBeInTheDocument();
  });

  it('renders a custom message', () => {
    render(<EmptyState message="아무것도 없어요" />);
    expect(screen.getByText('아무것도 없어요')).toBeInTheDocument();
  });
});
