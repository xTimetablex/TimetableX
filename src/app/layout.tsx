import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import BackgroundField from "@/components/BackgroundField";

// Self-hosted by next/font at build time: no request to Google from the
// visitor's browser (which would send their IP address to Google without
// consent) and no render-blocking CSS @import chain.
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EE" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1112" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "TimetableX",
  description: "Der bessere Vertretungsplan",
  appleWebApp: {
    capable: true,
    title: "TimetableX",
    statusBarStyle: "default",
  },
};

// Installed PWAs should open the app directly, even if their cached start_url
// still points at "/" from before the manifest changed. The display mode only
// exists in the browser, so this can't be a server redirect. (Logged-in
// browser visitors are redirected on the server, in src/app/page.tsx.)
const PWA_START_REDIRECT = `
  if (location.pathname === '/' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  )) location.replace('/app');
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${atkinson.variable} ${fraunces.variable}`}>
      <head>
        {/* Runs while the HTML is parsed, so the landing page never flashes. */}
        <script dangerouslySetInnerHTML={{ __html: PWA_START_REDIRECT }} />
      </head>
      <body className="antialiased">
        <div id="scroll-root">
          <BackgroundField />
          <Providers>{children}</Providers>
        </div>
        <Script id="unregister-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.getRegistrations()
                  .then(function(registrations) {
                    registrations.forEach(function(registration) {
                      registration.unregister();
                    });
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
