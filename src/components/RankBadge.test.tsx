import { render, screen } from '@testing-library/react';
import { RankBadge } from './RankBadge';

describe('RankBadge', () => {
  it('renders rank name', () => {
    render(<RankBadge rank="mythic" />);
    expect(screen.getByText('Mythic')).toBeInTheDocument();
  });

  it('renders rank icon', () => {
    const { container } = render(<RankBadge rank="mythic" />);
    expect(container.textContent).toContain('🔥');
  });

  it('hides name when showName is false', () => {
    render(<RankBadge rank="mythic" showName={false} />);
    expect(screen.queryByText('Mythic')).not.toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { container } = render(<RankBadge rank="mythic" size="lg" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('text-base');
  });

  it('renders unknown rank gracefully', () => {
    render(<RankBadge rank="unknown-rank" />);
    expect(screen.getByText('unknown-rank')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<RankBadge rank="mythic" className="my-custom-class" />);
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('my-custom-class');
  });
});
