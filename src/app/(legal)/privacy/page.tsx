import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad | El VIP de MM',
  description: 'Cómo El VIP de MM trata tus datos personales.',
};

export default function PrivacyPage() {
  return (
    <article className="space-y-6 rounded-xl border border-white/10 bg-zinc-900 p-6 sm:p-8">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Política de privacidad
        </h1>
        <p className="text-sm text-zinc-500">Última actualización: 16 de octubre de 2026</p>
      </header>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          El VIP de MM es una comunidad privada de cine. Para tu cuenta
          guardamos nombre, email y, si corresponde, datos básicos de Google
          (email, nombre e imagen) o el hash de tu contraseña. También usamos
          cookies de sesión.
        </p>
        <p>
          Esos datos sirven solo para autenticarte, operar el club y enviarte
          emails necesarios (por ejemplo verificación o restablecer
          contraseña). No los vendemos.
        </p>
        <p>
          Para pedir acceso, corrección o borrado de tus datos, contactá a un
          administrador del club.
        </p>
      </div>
    </article>
  );
}
