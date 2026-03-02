import { render, screen } from '@testing-library/react';
import { RoleIcon } from './RoleIcon';

describe('RoleIcon', () => {
  it('renders role name by default', () => {
    render(<RoleIcon role="gold" />);
    expect(screen.getByText('Gold Lane')).toBeInTheDocument();
  });

  it('hides name when showName is false', () => {
    render(<RoleIcon role="gold" showName={false} />);
    expect(screen.queryByText('Gold Lane')).not.toBeInTheDocument();
  });

  it('renders fallback for unknown role', () => {
    render(<RoleIcon role="unknown-role" />);
    expect(screen.getByText('unknown-role')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<RoleIcon role="gold" className="test-class" />);
    const wrapper = container.querySelector('span');
    expect(wrapper?.className).toContain('test-class');
  });

  it('applies correct size classes', () => {
    const { container } = render(<RoleIcon role="gold" size="lg" />);
    const iconSpan = container.querySelector('span > span');
    expect(iconSpan?.className).toContain('w-6');
  });
});
