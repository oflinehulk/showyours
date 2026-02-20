import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { CircuitBackground } from "@/components/tron/CircuitBackground";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="relative container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <CircuitBackground intensity="light" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-8xl font-display font-bold text-[#FF4500] mb-4 animate-neon-flicker" style={{ textShadow: '0 0 20px rgba(255,69,0,0.5), 0 0 40px rgba(255,69,0,0.2)' }}>
            404
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2 tracking-wide">Page Not Found</h1>
          <p className="text-muted-foreground mb-8 text-center max-w-md">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="border-[#FF4500]/20 hover:border-[#FF4500]/40" onClick={() => window.history.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button className="btn-gaming" asChild>
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
