import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { useMySquads } from '@/hooks/useSquads';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Users, UserPlus, Shield, LogOut, LogIn, Settings, ShieldCheck, Trophy, Search, RefreshCw, BookOpen, ChevronDown, User } from 'lucide-react';
import { toast } from 'sonner';
import { InvitationBadge } from '@/components/InvitationInbox';
import { NotificationBell } from '@/components/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const navLinks = [
  { to: '/players', label: 'Find Players', icon: Users },
  { to: '/squads', label: 'Find Squads', icon: Search },
  { to: '/tournaments', label: 'Tournaments', icon: Trophy },
  { to: '/docs', label: 'Docs', icon: BookOpen },
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
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
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
                {hasProfile && <InvitationBadge />}
                {hasProfile && <NotificationBell />}
                <Button variant="ghost" size="icon" onClick={handleHardRefresh} className="btn-interactive w-9 h-9 text-muted-foreground hover:text-[#FF4500] focus-visible:ring-2 focus-visible:ring-ring" title="Hard refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>

                {/* Avatar dropdown — groups Profile, Squad, Admin, Logout */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                      <Avatar className="h-7 w-7">
                        {myProfile?.avatar_url ? (
                          <AvatarImage src={myProfile.avatar_url} alt={myProfile.ign} />
                        ) : null}
                        <AvatarFallback className="bg-[#FF4500]/10 text-[#FF4500] text-xs">
                          {myProfile?.ign?.charAt(0)?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {hasProfile ? (
                      <DropdownMenuItem asChild>
                        <Link to={`/player/${myProfile.id}`} className="flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          My Profile
                        </Link>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem asChild>
                        <Link to="/create-profile" className="flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Create Profile
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {hasSquad ? (
                      <DropdownMenuItem asChild>
                        <Link to={`/squad/${mySquads[0].id}`} className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          My Squad
                        </Link>
                      </DropdownMenuItem>
                    ) : hasProfile ? (
                      <DropdownMenuItem asChild>
                        <Link to="/create-squad" className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Create Squad
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 text-[#FF4500]">
                            <ShieldCheck className="w-4 h-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 text-muted-foreground">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

          {/* Mobile: essential actions only */}
          <div className="flex md:hidden items-center gap-1">
            {user ? (
              <>
                {hasProfile && <InvitationBadge />}
                {hasProfile && <NotificationBell />}
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="w-10 h-10 text-muted-foreground hover:text-[#FF4500]" aria-label="Sign out">
                  <LogOut className="w-5 h-5" />
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
