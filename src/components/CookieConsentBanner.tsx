"use client";

import Link from "next/link";
import { Button } from "./button";

type CookieConsentBannerProps = {
  onAccept: () => void;
  onReject: () => void;
};

export default function CookieConsentBanner({
  onAccept,
  onReject,
}: CookieConsentBannerProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 pt-3 sm:px-6 sm:pb-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="panel border border-[var(--color-border)] bg-[color:var(--color-surface)] px-4 py-4 shadow-lg sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-lg leading-tight text-[var(--color-text)] sm:text-2xl">
                Analyse-Cookies aktivieren?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:text-base">
                Wir nutzen Cookies, um die Website zu verbessern. Du kannst die
                Analyse ablehnen. Mehr dazu in der{" "}
                <Link
                  href="/datenschutz"
                  className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
                >
                  Datenschutzerklärung
                </Link>
                .
              </p>
            </div>

            <div className="flex flex-row gap-3 lg:flex-col">
              <Button
                type="button"
                onClick={onReject}
                variant="outline"
                className="flex-1 rounded-full px-4 py-3 text-sm sm:flex-none sm:px-5"
              >
                Nur notwendige
              </Button>
              <Button
                type="button"
                onClick={onAccept}
                variant="primary"
                className="flex-1 rounded-full px-4 py-3 text-sm sm:flex-none sm:px-5"
              >
                Analyse akzeptieren
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
