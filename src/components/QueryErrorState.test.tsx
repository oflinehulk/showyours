import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { QueryErrorState } from './QueryErrorState';

// Mock the GlowCard since it's a styled wrapper
vi.mock('@/components/tron/GlowCard', () => ({
  GlowCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glow-card" className={className}>{children}</div>
  ),
}));

describe('QueryErrorState', () => {
  it('renders error message', () => {
    render(<QueryErrorState error={new Error('Something went wrong')} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders sanitized message for Supabase errors', () => {
    render(<QueryErrorState error={new Error('Invalid login credentials')} />);
    expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn();
    render(<QueryErrorState error={new Error('Error')} onRetry={onRetry} />);

    const button = screen.getByText('Try again');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render retry button when onRetry is not provided', () => {
    render(<QueryErrorState error={new Error('Error')} />);
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  it('renders with default message when no error', () => {
    render(<QueryErrorState />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
