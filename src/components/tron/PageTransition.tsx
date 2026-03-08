import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

const desktopVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

const mobileVariants = {
  initial: { opacity: 0, x: 40 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.15 },
  },
};

const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const variants = prefersReducedMotion
    ? reducedMotionVariants
    : isMobile
      ? mobileVariants
      : desktopVariants;

  return (
    <motion.div
      key={location.pathname}
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}
