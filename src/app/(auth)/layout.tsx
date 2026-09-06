'use client';

import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />
      <div className="relative z-10 flex flex-col items-center w-full max-w-[450px]">
        <div className="w-full mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Míralos Morir"
            width={890}
            height={167}
            className="w-full h-auto"
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}
