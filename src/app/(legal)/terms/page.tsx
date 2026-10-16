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

      <section className="space-y-3 text-sm leading-relaxed">
        <p>
          Estos términos regulan el uso de El VIP de MM en{' '}
          <a
            href="https://www.elvipdemm.com"
            className="text-yellow-500 hover:underline"
          >
            elvipdemm.com
          </a>
          . Al crear una cuenta o usar el sitio, aceptás estas condiciones.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">El servicio</h2>
        <p>
          El VIP de MM es una comunidad privada orientada al cine y a
          actividades del club. El acceso está restringido: el alta requiere un
          código VIP válido y queda a criterio de los administradores.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Tu cuenta</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Sos responsable de la confidencialidad de tus credenciales.</li>
          <li>
            Debés proporcionar información veraz al registrarte (email/nombre o
            cuenta de Google).
          </li>
          <li>
            Podés iniciar sesión con email y contraseña o con Google, según lo
            disponible en el sitio.
          </li>
          <li>
            Nos reservamos el derecho de suspender o eliminar cuentas que
            abusen del servicio, compartan el código VIP sin autorización o
            vulneren estos términos.
          </li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Uso aceptable</h2>
        <p>Te comprometés a no:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Intentar acceder a cuentas o datos de otros miembros.</li>
          <li>Interferir con la seguridad o disponibilidad del sitio.</li>
          <li>
            Publicar contenido ilegal, ofensivo o que viole derechos de
            terceros.
          </li>
          <li>Usar el servicio con fines comerciales no autorizados.</li>
        </ul>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Contenido</h2>
        <p>
          El contenido que publiques sigue siendo tuyo. Nos otorgás una licencia
          no exclusiva para alojarlo y mostrarlo dentro del servicio mientras tu
          cuenta exista. El sitio y la marca El VIP de MM / Míralos Morir
          pertenecen a sus titulares.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Disponibilidad</h2>
        <p>
          Ofrecemos el servicio “tal cual”. Puede haber interrupciones,
          errores o cambios de funciones. No garantizamos disponibilidad
          ininterrumpida.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Limitación de responsabilidad</h2>
        <p>
          En la medida permitida por la ley aplicable, no seremos responsables
          por daños indirectos, lucro cesante o pérdida de datos derivados del
          uso o la imposibilidad de usar el servicio.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Privacidad</h2>
        <p>
          El tratamiento de datos personales se describe en la{' '}
          <a href="/privacy" className="text-yellow-500 hover:underline">
            Política de privacidad
          </a>
          .
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Cambios</h2>
        <p>
          Podemos actualizar estos términos. La fecha de “Última actualización”
          indica la versión vigente. Si el cambio es material, intentaremos
          avisar de forma razonable dentro del servicio.
        </p>
      </section>

      <section className="space-y-2 text-sm leading-relaxed">
        <h2 className="text-base font-medium text-white">Contacto</h2>
        <p>
          Consultas:{' '}
          <a
            href="mailto:onboarding@elvipdemm.com"
            className="text-yellow-500 hover:underline"
          >
            onboarding@elvipdemm.com
          </a>
          .
        </p>
      </section>
    </article>
  );
}
