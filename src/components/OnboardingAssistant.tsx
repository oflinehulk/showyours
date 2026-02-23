import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnboardingContext } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import {
  Sparkles,
  User,
  Shield,
  Trophy,
  ClipboardList,
  Rocket,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

interface StepConfig {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  externalLink?: string;
}

const steps: StepConfig[] = [
  {
    icon: Sparkles,
    title: 'Welcome to ShowYours!',
    description:
      'Your home for MLBB esports in India. Find players, build squads, and compete in tournaments. Let us show you around!',
  },
  {
    icon: User,
    title: 'Set Up Your Profile',
    description:
      'Complete your player profile with your IGN, rank, main role, and hero pool so other players can find you.',
    actionLabel: 'Go to Profile',
    actionPath: '/create-profile',
  },
  {
    icon: Shield,
    title: 'Join a Squad',
    description:
      'Browse squads that are recruiting, or create your own. Having a squad unlocks tournament registration.',
    actionLabel: 'Browse Squads',
    actionPath: '/squads',
  },
  {
    icon: Trophy,
    title: 'Find a Tournament',
    description:
      'Check out upcoming tournaments. Register your squad and compete against the best teams in India.',
    actionLabel: 'View Tournaments',
    actionPath: '/tournaments',
  },
  {
    icon: ClipboardList,
    title: 'Register Your Squad',
    description:
      'Once you find a tournament, register your squad with a full roster (5 main players + up to 5 substitutes). The squad leader handles registration.',
  },
  {
    icon: Rocket,
    title: "You're Ready!",
    description:
      "You know the basics. Time to show what you've got. Good luck on the battlefield!",
  },
];

function StepContent({ step, onAction }: { step: StepConfig; onAction?: () => void }) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col items-center text-center px-4 py-2"
    >
      <div className="w-14 h-14 rounded-full bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-[#FF4500]" />
      </div>
      <h3 className="text-lg font-display font-bold text-foreground mb-2">
        {step.title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {step.description}
      </p>
      {step.actionLabel && onAction && (
        <Button
          size="sm"
          variant="outline"
          className="border-[#FF4500]/30 text-[#FF4500] hover:bg-[#FF4500]/10"
          onClick={onAction}
        >
          {step.actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

function OnboardingInner() {
  const navigate = useNavigate();
  const {
    currentStep,
    totalSteps,
    setOpen,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
  } = useOnboardingContext();

  const progressPercent = ((currentStep + 1) / totalSteps) * 100;
  const step = steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  const fireConfetti = useCallback(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF4500', '#FF6B35', '#FF2D00', '#ffffff'],
    });
  }, []);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      fireConfetti();
      completeOnboarding();
    } else {
      nextStep();
      if (currentStep + 1 === totalSteps - 1) {
        setTimeout(fireConfetti, 300);
      }
    }
  }, [isLastStep, currentStep, totalSteps, nextStep, completeOnboarding, fireConfetti]);

  const handleAction = useCallback(() => {
    if (step.externalLink) {
      window.open(step.externalLink, '_blank', 'noopener,noreferrer');
    } else if (step.actionPath) {
      navigate(step.actionPath);
      setOpen(false);
    }
  }, [step, navigate, setOpen]);

  return (
    <div className="flex flex-col h-full">
      {/* Header with progress */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <Progress
          value={progressPercent}
          className="h-1.5 bg-[#0a0a0a]"
        />
      </div>

      {/* Step content with animation */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <AnimatePresence mode="wait">
          <StepContent key={currentStep} step={step} onAction={step.actionLabel ? handleAction : undefined} />
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="px-4 pb-4 pt-2 border-t border-[#FF4500]/10">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={isFirstStep}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          <button
            onClick={skipOnboarding}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Skip
          </button>

          <Button
            size="sm"
            className={isLastStep ? 'btn-gaming' : 'bg-[#FF4500] hover:bg-[#FF4500]/90 text-white'}
            onClick={handleNext}
          >
            {isLastStep ? 'Complete' : 'Next'}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function OnboardingAssistant() {
  const isMobile = useIsMobile();
  const { isOpen, setOpen } = useOnboardingContext();

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#111111] border-t border-[#FF4500]/20 max-h-[85vh]">
          <OnboardingInner />
        </DrawerContent>
      </Drawer>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-4 z-50 w-[420px]">
      <div className="bg-[#111111] border border-[#FF4500]/20 rounded-lg shadow-[0_0_30px_rgba(255,69,0,0.15)] overflow-hidden">
        <OnboardingInner />
      </div>
    </div>
  );
}
