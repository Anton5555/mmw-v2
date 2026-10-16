import Image from 'next/image';
import Link from 'next/link';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh w-full bg-zinc-950 text-zinc-300">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />
      <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:py-14">
        <Link href="/sign-in" className="mx-auto block w-full max-w-sm">
          <Image
            src="/logo.png"
            alt="El VIP de MM"
            width={890}
            height={167}
            className="h-auto w-full"
            priority
          />
        </Link>
        {children}
        <p className="text-center text-sm text-zinc-500">
          <Link href="/privacy" className="hover:text-yellow-500">
            Privacidad
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terms" className="hover:text-yellow-500">
            Términos
          </Link>
          <span className="mx-2">·</span>
          <Link href="/sign-in" className="hover:text-yellow-500">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
