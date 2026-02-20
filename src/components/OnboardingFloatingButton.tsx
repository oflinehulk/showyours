import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { HelpCircle } from 'lucide-react';

export function OnboardingFloatingButton() {
  const { user } = useAuth();
  const { data: myProfile } = useMyProfile();
  const { isOpen, setOpen } = useOnboardingContext();

  if (!user || !myProfile || isOpen) return null;

  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-[#FF4500] text-white w-10 h-10 rounded-full shadow-[0_0_12px_rgba(255,69,0,0.4)] flex items-center justify-center hover:scale-110 hover:shadow-[0_0_20px_rgba(255,69,0,0.6)] transition-all duration-200"
      aria-label="Open onboarding guide"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
