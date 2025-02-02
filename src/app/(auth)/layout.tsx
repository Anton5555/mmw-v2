'use client';

import { CustomAuroraBackground } from '@/components/shared/custom-aurora-background';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomAuroraBackground>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-8">
        {/* Logo Container */}
        <div className="w-full max-w-[400px] mb-8">
          <Image
            src="/logo.png"
            alt={'Míralos Morir V2 logo'}
            width={890}
            height={167}
            className="w-full h-auto"
            priority
          />
        </div>
        {children}
      </div>
    </CustomAuroraBackground>
  );
}
