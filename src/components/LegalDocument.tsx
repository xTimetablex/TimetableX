import type { ReactNode } from "react";
import Link from "next/link";

type LegalDocumentProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function LegalDocument({ title, subtitle, children }: LegalDocumentProps) {
  return (
    <main className="app-shell px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="panel relative overflow-hidden px-5 py-6 shadow-lg sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-success)]" />

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                Rechtliche Informationen
              </p>
              <h1 className="text-3xl leading-tight text-[var(--color-text)] sm:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-3 text-base text-[var(--color-text-secondary)]">{subtitle}</p>
              ) : null}
            </div>

            <Link
              href="/app"
              className="btn btn-outline shrink-0 rounded-full px-4 py-2 text-sm"
            >
              Zur Startseite
            </Link>
          </div>

          <div className="legal-content max-w-none">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
