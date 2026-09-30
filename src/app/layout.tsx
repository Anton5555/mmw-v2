import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'El VIP de MM',
  description: 'El VIP de MM',
};

// The app is always dark: match the browser chrome/status bar to the header,
// and let the page paint under the notch (content pads back out via env()).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#09090b',
  colorScheme: 'dark',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextTopLoader color="#eab308" height={2} showSpinner={false} />

        <main className="flex-1">
          <NuqsAdapter>{children}</NuqsAdapter>
        </main>

        <Toaster theme="dark" />
      </body>
    </html>
  );
}
