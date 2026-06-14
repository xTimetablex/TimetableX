'use client';

import Link from 'next/link';
import { m } from 'framer-motion';

export default function LandingFooter() {
  return (
    <m.footer
      className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm sm:flex-row sm:px-6 lg:px-8"
      style={{ color: 'var(--color-text-muted)' }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <p>TimetableX</p>
      <nav className="flex items-center gap-4">
        <Link href="/datenschutz" className="transition-colors hover:text-[var(--color-text)]">
          Datenschutz
        </Link>
        <Link href="/impressum" className="transition-colors hover:text-[var(--color-text)]">
          Impressum
        </Link>
      </nav>
    </m.footer>
  );
}
