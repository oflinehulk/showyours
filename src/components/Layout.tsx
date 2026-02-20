import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { BottomTabBar } from './BottomTabBar';
import { ScanLineOverlay } from './tron/ScanLineOverlay';
import { PageTransition } from './tron/PageTransition';
import { OnboardingAssistant } from './OnboardingAssistant';
import { OnboardingFloatingButton } from './OnboardingFloatingButton';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] relative">
      <ScanLineOverlay />
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <BottomTabBar />
      <OnboardingAssistant />
      <OnboardingFloatingButton />
    </div>
  );
}
