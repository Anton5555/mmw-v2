import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos del servicio | El VIP de MM',
  description: 'Condiciones de uso de El VIP de MM.',
};

export default function TermsPage() {
  return (
    <article className="space-y-6 rounded-xl border border-white/10 bg-zinc-900 p-6 sm:p-8">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Términos del servicio
        </h1>
        <p className="text-sm text-zinc-500">Última actualización: 16 de octubre de 2026</p>
      </header>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          El VIP de MM es un club privado. El alta requiere un código VIP y
          queda a criterio de los administradores.
        </p>
        <p>
          Sos responsable de tu cuenta. No intentes acceder a datos de otros,
          abusar del servicio ni compartir el código VIP sin autorización.
          Podemos suspender o eliminar cuentas que lo hagan.
        </p>
        <p>
          El servicio se ofrece tal cual, sin garantía de disponibilidad
          continua. El tratamiento de datos está en la{' '}
          <a href="/privacy" className="text-yellow-500 hover:underline">
            política de privacidad
          </a>
          .
        </p>
      </div>
    </article>
  );
}
