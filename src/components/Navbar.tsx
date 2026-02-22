import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { useMySquads } from '@/hooks/useSquads';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Users, UserPlus, Shield, LogOut, LogIn, Settings, ShieldCheck, Trophy, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { InvitationBadge } from '@/components/InvitationInbox';

const navLinks = [
  { to: '/players', label: 'Find Players', icon: Users },
  { to: '/squads', label: 'Find Squads', icon: Search },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
];

export function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { data: myProfile } = useMyProfile();
  const { data: mySquads } = useMySquads();
  const { data: isAdmin } = useIsAdmin();

  const hasProfile = !!myProfile;
  const hasSquad = mySquads && mySquads.length > 0;

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  const handleHardRefresh = () => {
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#FF4500]/10 bg-[#0a0a0a]/95 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Logo />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 flex items-center gap-2',
                  'hover:scale-[1.02] active:scale-[0.98]',
                  location.pathname === link.to
                    ? 'bg-[#FF4500]/10 text-[#FF4500] border border-[#FF4500]/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#111111]'
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons - Desktop only */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="btn-interactive border-[#FF4500]/30 text-[#FF4500] hover:bg-[#FF4500]/10" asChild>
                    <Link to="/admin">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Admin
                    </Link>
                  </Button>
                )}
                {hasProfile ? (
                  <Button variant="outline" size="sm" className="btn-interactive border-[#FF4500]/20 hover:border-[#FF4500]/40" asChild>
                    <Link to={`/player/${myProfile.id}`}>
                      <Settings className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="btn-interactive border-[#FF4500]/20 hover:border-[#FF4500]/40" asChild>
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
                {hasProfile && <InvitationBadge />}
                <Button variant="ghost" size="icon" onClick={handleHardRefresh} className="btn-interactive w-9 h-9 text-muted-foreground hover:text-[#FF4500]" title="Hard refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="btn-interactive text-muted-foreground hover:text-[#FF4500]">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={handleHardRefresh} className="btn-interactive w-9 h-9 text-muted-foreground hover:text-[#FF4500]" title="Hard refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button size="sm" className="btn-gaming" asChild>
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile: just show key actions inline */}
          <div className="flex md:hidden items-center gap-1">
            {user ? (
              <>
                {hasSquad && (
                  <Button variant="ghost" size="icon" className="w-9 h-9 text-[#FF4500] hover:text-[#FF6B35]" asChild title="Manage Squad">
                    <Link to={`/squad/${mySquads[0].id}`}><Shield className="w-4 h-4" /></Link>
                  </Button>
                )}
                {hasProfile && <InvitationBadge />}
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-[#FF4500]" asChild>
                    <Link to="/admin"><ShieldCheck className="w-4 h-4" /></Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="w-9 h-9 text-muted-foreground hover:text-[#FF4500]">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="btn-gaming text-xs" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
