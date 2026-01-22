'use client';

import Image from 'next/image';
import { LampContainer } from '@/components/shared/lamp-background';
import { SpotlightCursor } from '@/components/shared/spotlight-cursor';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LampContainer className="p-4">
      <SpotlightCursor />
      <div className="relative z-50 flex flex-col items-center w-full">
        <div className="w-full max-w-[450px] mb-8 flex justify-center">
          <Image
            src="/logo.png"
            alt="Míralos Morir"
            width={890}
            height={167}
            className="w-full h-auto drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-transform duration-700 hover:scale-105"
            priority
          />
        </div>
        <div className="w-full animate-fade-in-up" style={{ animationDuration: '1s' }}>
          {children}
        </div>
      </div>
    </LampContainer>
  );
}
