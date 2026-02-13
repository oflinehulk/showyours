import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { useMySquads } from '@/hooks/useSquads';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Users, UserPlus, Shield, Menu, X, LogOut, LogIn, Settings, ShieldCheck, Trophy, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

const navLinks = [
  { to: '/players', label: 'Find Players', icon: Users, description: 'Squads looking for players' },
  { to: '/squads', label: 'Find Squads', icon: Search, description: 'Players looking for squads' },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy, description: 'Compete with your squad' },
];

export function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: myProfile } = useMyProfile();
  const { data: mySquads } = useMySquads();
  const { data: isAdmin } = useIsAdmin();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hasProfile = !!myProfile;
  const hasSquad = mySquads && mySquads.length > 0;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  location.pathname === link.to
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="btn-interactive border-secondary text-secondary hover:bg-secondary/10" asChild>
                    <Link to="/admin">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin
                    </Link>
                  </Button>
                )}
                {hasProfile ? (
                  <Button variant="outline" size="sm" className="btn-interactive" asChild>
                    <Link to={`/player/${myProfile.id}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Manage Profile
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="btn-interactive" asChild>
                    <Link to="/create-profile">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Profile
                    </Link>
                  </Button>
                )}
                {hasSquad ? (
                  <Button size="sm" className="btn-gaming" asChild>
                    <Link to={`/squad/${mySquads[0].id}`}>Manage Squad</Link>
                  </Button>
                ) : (
                  hasProfile && (
                    <Button size="sm" className="btn-gaming" asChild>
                      <Link to="/create-squad">Post Squad</Link>
                    </Button>
                  )
                )}
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="btn-interactive">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Button size="sm" className="btn-gaming" asChild>
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-foreground btn-interactive rounded-lg"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-in">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2',
                    'active:scale-[0.98]',
                    location.pathname === link.to
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/50">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button variant="outline" size="sm" className="btn-interactive border-secondary text-secondary hover:bg-secondary/10" asChild>
                        <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                          <ShieldCheck className="w-4 h-4 mr-2" />
                          Admin Panel
                        </Link>
                      </Button>
                    )}
                    {hasProfile ? (
                      <Button variant="outline" size="sm" className="btn-interactive" asChild>
                        <Link to={`/player/${myProfile.id}`} onClick={() => setMobileMenuOpen(false)}>
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Profile
                        </Link>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="btn-interactive" asChild>
                        <Link to="/create-profile" onClick={() => setMobileMenuOpen(false)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create Profile
                        </Link>
                      </Button>
                    )}
                    {hasSquad ? (
                      <Button size="sm" className="btn-gaming" asChild>
                        <Link to={`/squad/${mySquads[0].id}`} onClick={() => setMobileMenuOpen(false)}>
                          Manage Squad
                        </Link>
                      </Button>
                    ) : (
                      hasProfile && (
                        <Button size="sm" className="btn-gaming" asChild>
                          <Link to="/create-squad" onClick={() => setMobileMenuOpen(false)}>
                            Post Squad
                          </Link>
                        </Button>
                      )
                    )}
                    <div className="flex items-center gap-2">
                      <ThemeToggle />
                      <Button variant="ghost" size="sm" onClick={handleSignOut} className="btn-interactive flex-1">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button size="sm" className="btn-gaming flex-1" asChild>
                      <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
