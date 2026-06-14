'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';

import { useAuth } from '@/lib/hooks/useAuth';
import LandingHero from './LandingHero';
import LandingFeatures from './LandingFeatures';
import LandingShowcase from './LandingShowcase';
import LandingFooter from './LandingFooter';

function isStandaloneDisplayMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isLogged, isInitialized } = useAuth();

  // Installed PWAs should land on the app directly, even if their cached
  // start_url still points at "/" from before this routing change.
  useEffect(() => {
    if (isStandaloneDisplayMode()) {
      router.replace('/app');
    }
  }, [router]);

  useEffect(() => {
    if (isInitialized && isLogged) {
      router.replace('/app');
    }
  }, [isInitialized, isLogged, router]);

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
