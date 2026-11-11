'use client';

import { useOpenConsentSettings } from '@/lib/hooks/useConsentSettings';

/** Footer entry that reopens the cookie banner; styled like the footer links. */
export default function ConsentSettingsButton() {
  const openConsentSettings = useOpenConsentSettings();

  return (
    <button
      type="button"
      onClick={openConsentSettings}
      className="cursor-pointer transition-colors hover:text-[var(--color-text)]"
    >
      Cookies
    </button>
  );
}
