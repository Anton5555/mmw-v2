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

      <section className="space-y-3 text-sm leading-relaxed">
        <p>
          El VIP de MM (“nosotros”) opera el sitio{' '}
          <a
            href="https://www.elvipdemm.com"
            className="text-yellow-500 hover:underline"
          >
            elvipdemm.com
          </a>
          , una comunidad privada de cine. Esta política explica qué datos
          reunimos, para qué los usamos y cómo podés ejercer tus derechos.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Datos que reunimos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="text-zinc-200">Cuenta:</span> nombre, email y, si
            te registrás con contraseña, el hash de la contraseña.
          </li>
          <li>
            <span className="text-zinc-200">Google:</span> si elegís “Continuar
            con Google”, recibimos el identificador de la cuenta, email, nombre
            e imagen de perfil que Google nos comparte con tu consentimiento.
          </li>
          <li>
            <span className="text-zinc-200">Uso del servicio:</span> contenido
            que cargás o generás en la plataforma (por ejemplo listas,
            predicciones u otros aportes del club).
          </li>
          <li>
            <span className="text-zinc-200">Técnicos:</span> cookies de sesión
            necesarias para mantenerte autenticado, y registros básicos del
            servidor (por ejemplo dirección IP y fecha) para seguridad y
            operación.
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Para qué los usamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Crear y administrar tu cuenta (acceso restringido por código VIP).</li>
          <li>Autenticarte y mantener la sesión.</li>
          <li>Enviar emails transaccionales (verificación, restablecer contraseña).</li>
          <li>Prestar las funciones del club y mejorar la estabilidad del servicio.</li>
          <li>Prevenir abuso, fraude o accesos no autorizados.</li>
        </ul>
        <p>
          No vendemos tus datos personales ni los usamos para publicidad de
          terceros.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Proveedores</h2>
        <p>
          Tratamos datos con proveedores que nos ayudan a operar el servicio,
          bajo sus propios términos y medidas de seguridad, por ejemplo:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Hosting y despliegue (p. ej. Vercel).</li>
          <li>Base de datos y almacenamiento de archivos.</li>
          <li>Envío de email (Resend).</li>
          <li>Inicio de sesión con Google, si lo usás.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Conservación</h2>
        <p>
          Conservamos los datos de cuenta mientras tu usuario exista. Podés
          pedir la eliminación de tu cuenta escribiéndonos; entonces borraremos
          o anonimizaremos lo razonablemente posible, salvo lo que debamos
          conservar por obligación legal o seguridad.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Tus derechos</h2>
        <p>
          Podés solicitar acceso, corrección o eliminación de tus datos
          personales contactándonos a{' '}
          <a
            href="mailto:onboarding@elvipdemm.com"
            className="text-yellow-500 hover:underline"
          >
            onboarding@elvipdemm.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Cambios</h2>
        <p>
          Podemos actualizar esta política. La fecha de “Última actualización”
          indica la versión vigente. El uso continuado del servicio después de
          un cambio implica que tomaste conocimiento de la nueva versión.
        </p>
      </section>
    </article>
  );
}
