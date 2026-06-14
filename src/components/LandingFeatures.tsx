"use client";

import { m } from "framer-motion";
import { Calendar, Filter, EyeOff, Smartphone, Zap, Code2 } from "lucide-react";

import { springPop, staggerContainer } from "@/lib/motionVariants";

const FEATURES = [
  {
    icon: Calendar,
    title: "Wochenansicht",
    description: "Alle 5 Tage auf einen Blick.",
  },
  {
    icon: Filter,
    title: "Flexible Filter",
    description: "Nach Klasse, Lehrer oder Raum.",
  },
  {
    icon: EyeOff,
    title: "Fächer-Blacklist",
    description: "Blende aus, was dich nicht interessiert.",
  },
  {
    icon: Smartphone,
    title: "Installierbar",
    description: "Als App auf dem Homescreen (PWA).",
  },
  {
    icon: Zap,
    title: "Schnell & werbefrei",
    description: "Keine Tracker, keine Werbung, kein Ballast.",
  },
  {
    icon: Code2,
    title: "Öffentliche API",
    description: "Für Entwickler, die eigene Tools bauen wollen.",
  },
] as const;

export default function LandingFeatures() {
  return (
    <section id="features" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <m.h2
          className="text-center text-3xl font-bold sm:text-4xl"
          style={{ color: "var(--color-text)" }}
          variants={springPop}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          Alles, was du brauchst
        </m.h2>
        <m.div
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <m.div key={title} variants={springPop} className="panel p-5">
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)]"
                style={{
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                }}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3
                className="text-base font-semibold"
                style={{ color: "var(--color-text)" }}
              >
                {title}
              </h3>
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {description}
              </p>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
