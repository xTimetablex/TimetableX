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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${atkinson.variable} ${fraunces.variable}`}>
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
