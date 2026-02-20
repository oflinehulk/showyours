import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Gamepad2, Github, Twitter, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#FF4500]/10 bg-[#0a0a0a]">
      <div className="h-px bg-gradient-to-r from-transparent via-[#FF4500]/40 to-transparent" />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <Logo className="mb-4" />
            <p className="text-sm text-muted-foreground max-w-md">
              The ultimate platform for Mobile Legends: Bang Bang players to find their perfect teammate
              and showcase their skills to the community.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 text-sm tracking-wider uppercase">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/players" className="text-muted-foreground hover:text-neon transition-colors">Find Players</Link></li>
              <li><Link to="/squads" className="text-muted-foreground hover:text-neon transition-colors">Squad Listings</Link></li>
              <li><Link to="/create-profile" className="text-muted-foreground hover:text-neon transition-colors">Create Profile</Link></li>
              <li><Link to="/create-squad" className="text-muted-foreground hover:text-neon transition-colors">Post Squad Listing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold text-foreground mb-3 text-sm tracking-wider uppercase">Connect</h4>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-lg bg-[#111111] border border-[#FF4500]/10 flex items-center justify-center text-muted-foreground hover:text-neon hover:border-[#FF4500]/30 transition-all duration-200 hover:scale-105 active:scale-95"><Gamepad2 className="w-5 h-5" /></a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#111111] border border-[#FF4500]/10 flex items-center justify-center text-muted-foreground hover:text-neon hover:border-[#FF4500]/30 transition-all duration-200 hover:scale-105 active:scale-95"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="w-10 h-10 rounded-lg bg-[#111111] border border-[#FF4500]/10 flex items-center justify-center text-muted-foreground hover:text-neon hover:border-[#FF4500]/30 transition-all duration-200 hover:scale-105 active:scale-95"><Github className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-[#FF4500]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ShowYours. Not affiliated with Moonton.</p>
          <p className="flex items-center gap-1">Built with <Heart className="w-4 h-4 text-[#FF4500] fill-[#FF4500]" /> by Ram</p>
        </div>
      </div>
    </footer>
  );
}
