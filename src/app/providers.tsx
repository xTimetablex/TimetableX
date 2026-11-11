'use client'

import { useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HapticsProvider from '@/components/HapticsProvider'
import CookieConsentBanner from '@/components/CookieConsentBanner'
import { disableAnalytics, initAnalytics } from '@/lib/analytics'
import { ConsentSettingsContext } from '@/lib/hooks/useConsentSettings'
import { readTrackingConsent, writeTrackingConsent, type TrackingConsent } from '@/lib/trackingConsent'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false,
      },
    },
  }));
  const [trackingConsent, setTrackingConsent] = useState<TrackingConsent>("pending");
  const [isConsentLoaded, setIsConsentLoaded] = useState(false);
  // Reopened from the "Cookies" footer link to change an earlier choice.
  const [isConsentSettingsOpen, setIsConsentSettingsOpen] = useState(false);

  useEffect(() => {
    setTrackingConsent(readTrackingConsent());
    setIsConsentLoaded(true);
  }, []);

  // PostHog is only downloaded and started once the user has accepted tracking.
  useEffect(() => {
    if (trackingConsent === "accepted") void initAnalytics();
  }, [trackingConsent]);

  const openConsentSettings = useCallback(() => setIsConsentSettingsOpen(true), []);

  const handleAcceptTracking = () => {
    writeTrackingConsent("accepted");
    setTrackingConsent("accepted");
    setIsConsentSettingsOpen(false);
  };

  const handleRejectTracking = () => {
    writeTrackingConsent("rejected");
    setTrackingConsent("rejected");
    setIsConsentSettingsOpen(false);
    // Withdrawn after PostHog already ran in this page: reload so it's fully gone.
    if (disableAnalytics()) window.location.reload();
  };

  const shouldShowBanner =
    isConsentLoaded && (trackingConsent === "pending" || isConsentSettingsOpen);

  return (
    <QueryClientProvider client={queryClient}>
      <ConsentSettingsContext.Provider value={openConsentSettings}>
        <HapticsProvider />
        {children}
        {shouldShowBanner ? (
          <CookieConsentBanner
            onAccept={handleAcceptTracking}
            onReject={handleRejectTracking}
          />
        ) : null}
      </ConsentSettingsContext.Provider>
    </QueryClientProvider>
  )
}
