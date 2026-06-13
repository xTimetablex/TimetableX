'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { springPop, staggerContainer } from '@/lib/motionVariants';
import LandingTimetablePreview from './LandingTimetablePreview';

export default function LandingHero() {
  return (
    <section className="flex flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 lg:px-8">
      <motion.div
        className="flex w-full max-w-2xl flex-col items-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.span
          variants={springPop}
          className="inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold"
          style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          Der bessere Vertretungsplan
        </motion.span>

        <motion.h1
          variants={springPop}
          className="mt-4 text-4xl font-bold sm:text-6xl"
          style={{ color: 'var(--color-text)' }}
        >
          TimetableX
        </motion.h1>

        <motion.p
          variants={springPop}
          className="mt-4 max-w-md text-lg"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Dein Stundenplan. Klar, schnell, ohne Schnickschnack.
        </motion.p>

        <motion.div
          variants={springPop}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/app" className="btn btn-primary px-6 py-3 text-base">
            Jetzt starten
          </Link>
          <a href="#features" className="btn btn-outline px-6 py-3 text-base">
            Mehr erfahren
          </a>
        </motion.div>

        <motion.div
          variants={springPop}
          className="mt-12 w-full max-w-sm"
        >
          <div style={{ transform: 'rotate(-2deg)' }}>
            <LandingTimetablePreview rowCount={2} />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
