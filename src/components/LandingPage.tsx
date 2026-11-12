'use client';

import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';

import LandingHero from './LandingHero';
import LandingFeatures from './LandingFeatures';
import LandingShowcase from './LandingShowcase';
import LandingFooter from './LandingFooter';

// Installed PWAs are sent on to /app by an inline script in src/app/layout.tsx.
export default function LandingPage() {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-[100dvh] w-full flex-col">
          <LandingHero />
          <LandingFeatures />
          <LandingShowcase />
          <LandingFooter />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
