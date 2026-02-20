import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProfile } from '@/hooks/useProfiles';
import { useCompleteOnboarding } from '@/hooks/useOnboarding';

const TOTAL_STEPS = 7;

interface OnboardingContextType {
  isOpen: boolean;
  currentStep: number;
  totalSteps: number;
  setOpen: (open: boolean) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: myProfile, isLoading: profileLoading } = useMyProfile();
  const completeOnboardingMutation = useCompleteOnboarding();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (
      user &&
      !profileLoading &&
      myProfile &&
      (myProfile.has_completed_onboarding === false || myProfile.has_completed_onboarding === null)
    ) {
      setIsOpen(true);
      setCurrentStep(0);
    }
  }, [user, myProfile, profileLoading]);

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      setCurrentStep(0);
    }
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const skipOnboarding = useCallback(() => {
    setIsOpen(false);
    if (user) {
      completeOnboardingMutation.mutate(user.id);
    }
  }, [user, completeOnboardingMutation]);

  const completeOnboarding = useCallback(() => {
    setIsOpen(false);
    if (user) {
      completeOnboardingMutation.mutate(user.id);
    }
  }, [user, completeOnboardingMutation]);

  return (
    <OnboardingContext.Provider
      value={{
        isOpen,
        currentStep,
        totalSteps: TOTAL_STEPS,
        setOpen,
        nextStep,
        prevStep,
        skipOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
}
