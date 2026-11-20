import type { Metadata, Viewport } from 'next';
import { Barlow, Barlow_Condensed } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import NextTopLoader from 'nextjs-toploader';
import { MotionProvider } from '@/components/shared/motion-provider';
import { ServiceWorkerRegister } from '@/components/shared/sw-register';

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'El VIP de MM',
  description: 'El VIP de MM',
  // iOS "Add to Home Screen": open full screen, paint under the status bar
  // (the top nav and auth layout pad back out with safe-area insets).
  appleWebApp: {
    capable: true,
    title: 'VIP MM',
    statusBarStyle: 'black-translucent',
  },
};

// The app is always dark: match the browser chrome/status bar to the header,
// and let the page paint under the notch (content pads back out via env()).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#0a181b',
  colorScheme: 'dark',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${barlow.variable} ${barlowCondensed.variable} font-sans antialiased`}
      >
        <NextTopLoader color="#f2b632" height={2} showSpinner={false} />

        <main className="flex-1">
          <NuqsAdapter>
            <MotionProvider>{children}</MotionProvider>
          </NuqsAdapter>
        </main>

        <Toaster theme="dark" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
