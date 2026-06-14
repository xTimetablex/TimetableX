import type { Variants } from 'framer-motion';

export const springPop: Variants = {
  hidden: { opacity: 0, y: 36, scale: 0.85, rotate: -4 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 260, damping: 18 },
  },
};

export const heroPop: Variants = {
  hidden: { opacity: 0, y: 50, scale: 0.6, rotate: -10 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: { type: 'spring', stiffness: 140, damping: 14 },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};
