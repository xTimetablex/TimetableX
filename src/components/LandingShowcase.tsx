'use client';

import { motion } from 'framer-motion';

import { springPop, staggerContainer } from '@/lib/motionVariants';
import {
  MOCK_TIMETABLE_ENTRIES,
  LandingTimetableHeader,
  LandingTimetableRow,
} from './LandingTimetablePreview';

export default function LandingShowcase() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <h2 className="text-3xl font-bold sm:text-4xl" style={{ color: 'var(--color-text)' }}>
          So sieht&apos;s aus
        </h2>
        <p className="mt-3 max-w-md text-base" style={{ color: 'var(--color-text-secondary)' }}>
          Übersichtlich, schnell und genau das, was du brauchst — ohne Schnickschnack.
        </p>

        <div
          className="panel mt-10 w-full max-w-md overflow-hidden"
          style={{ transform: 'rotate(1.5deg)' }}
        >
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <LandingTimetableHeader />
            <div>
              {MOCK_TIMETABLE_ENTRIES.map((entry, i) => (
                <motion.div key={entry.hour} variants={springPop}>
                  <LandingTimetableRow
                    entry={entry}
                    isLast={i === MOCK_TIMETABLE_ENTRIES.length - 1}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
