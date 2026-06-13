'use client';

import { MotionConfig } from 'framer-motion';

import LandingHero from './LandingHero';
import LandingFeatures from './LandingFeatures';
import LandingShowcase from './LandingShowcase';
import LandingFooter from './LandingFooter';

export default function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-[100dvh] w-full flex-col">
        <LandingHero />
        <LandingFeatures />
        <LandingShowcase />
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
