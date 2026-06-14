"use client";

import Link from "next/link";
import { m } from "framer-motion";

import { springPop, staggerContainer } from "@/lib/motionVariants";
import LandingTimetablePreview from "./LandingTimetablePreview";

export default function LandingHero() {
  return (
    <section className="flex flex-col items-center px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-28 lg:px-8">
      <m.div
        className="flex w-full max-w-2xl flex-col items-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <m.h1
          variants={springPop}
          className="mt-4 text-4xl font-bold sm:text-6xl"
          style={{ color: "var(--color-text)" }}
        >
          TimetableX
        </m.h1>

        <m.p
          variants={springPop}
          className="mt-4 max-w-md text-lg"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Dein Stundenplan. Klar, schnell, ohne Schnickschnack.
        </m.p>

        <m.div
          variants={springPop}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link href="/app" className="btn btn-primary px-6 py-3 text-base">
            Jetzt starten
          </Link>
          <a href="#features" className="btn btn-outline px-6 py-3 text-base">
            Mehr erfahren
          </a>
        </m.div>

        <m.div variants={springPop} className="mt-12 w-full max-w-sm">
          <div style={{ transform: "rotate(-2deg)" }}>
            <LandingTimetablePreview rowCount={2} />
          </div>
        </m.div>
      </m.div>
    </section>
  );
}
