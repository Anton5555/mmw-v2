import type { Metadata } from 'next';
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <NextTopLoader />

        <main className="flex-1">
          <NuqsAdapter>{children}</NuqsAdapter>
        </main>

        <Toaster />
      </body>
    </html>
  );
}
