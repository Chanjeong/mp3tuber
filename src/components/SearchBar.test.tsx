import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from './SearchBar';

describe('SearchBar', () => {
  it('calls onSearch with the query when the submit button is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox'), 'lofi');
    await user.click(screen.getByRole('button', { name: /검색/ }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('lofi');
  });

  it('submits on Enter key', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox'), 'jazz{Enter}');

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('jazz');
  });

  it('trims surrounding whitespace before submitting', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox'), '  lofi  {Enter}');

    expect(onSearch).toHaveBeenCalledWith('lofi');
  });

  it('does not submit a blank query', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);

    await user.type(screen.getByRole('searchbox'), '   {Enter}');
    await user.click(screen.getByRole('button', { name: /검색/ }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('prevents duplicate submits while loading', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} loading />);

    await user.type(screen.getByRole('searchbox'), 'lofi{Enter}');
    await user.click(screen.getByRole('button', { name: /검색/ }));

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('labels the input for assistive tech', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toHaveAccessibleName(/검색/);
  });
});
