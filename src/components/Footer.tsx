import { Link } from 'react-router-dom';
import { Gamepad2, Github, Twitter } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">M</span>
              </div>
              <span className="font-bold text-lg">
                MLBB<span className="text-primary">Recruit</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              The ultimate platform for Mobile Legends: Bang Bang players to find their perfect squad 
              and showcase their skills to the community.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/players" className="text-muted-foreground hover:text-primary transition-colors">
                  Find Players
                </Link>
              </li>
              <li>
                <Link to="/squads" className="text-muted-foreground hover:text-primary transition-colors">
                  Squad Listings
                </Link>
              </li>
              <li>
                <Link to="/create-profile" className="text-muted-foreground hover:text-primary transition-colors">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link to="/create-squad" className="text-muted-foreground hover:text-primary transition-colors">
                  Post Squad Listing
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-foreground mb-3">Connect</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
              >
                <Gamepad2 className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} MLBBRecruit. Not affiliated with Moonton.</p>
        </div>
      </div>
    </footer>
  );
}
