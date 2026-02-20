import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, Users, Trophy, Shield, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';

const tabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/tournaments', icon: Trophy, label: 'Tourneys' },
  { to: '/squads', icon: Shield, label: 'Squads' },
];

export function BottomTabBar() {
  const location = useLocation();
  const { user } = useAuth();
  const { data: myProfile } = useMyProfile();

  const profileTab = {
    to: user ? (myProfile ? `/player/${myProfile.id}` : '/create-profile') : '/auth',
    icon: User,
    label: 'Me',
  };

  const allTabs = [...tabs, profileTab];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-[#FF4500]/10">
      <div className="flex items-center justify-around h-16 px-1">
        {allTabs.map((tab) => {
          const isActive =
            tab.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.to);

          return (
            <Link
              key={tab.label}
              to={tab.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors duration-200',
                isActive ? 'text-[#FF4500]' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FF4500] shadow-[0_0_6px_rgba(255,69,0,0.8)]" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'font-bold'
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
