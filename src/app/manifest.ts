import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TimetableX',
    short_name: 'TimetableX',
    description: 'The better version of VPMobil24',
    start_url: '/app',
    scope: '/',
    id: '/',
    display: 'standalone',
    background_color: '#F7F3EE',
    theme_color: '#7AA2F7',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
